import { readFileSync } from 'fs'
import { join } from 'path'

export interface CertificateConfig {
  ca?: string
  cert?: string
  key?: string
}

/**
 * Loads certificates for ClickHouse connection from various sources
 */
export class CertificateManager {
  private certificates: CertificateConfig = {}

  constructor() {
    this.loadCertificates()
  }

  private loadCertificates(): void {
    // 1. Try to load from environment variable paths
    this.loadFromEnvPaths()
    
    // 2. Try to load from OpenShift/Kubernetes service account
    this.loadServiceAccountCA()
    
    // 3. Try to load from mounted secrets/configmaps (common OpenShift pattern)
    this.loadMountedCertificates()
  }

  private loadFromEnvPaths(): void {
    const envPaths = {
      ca: process.env.CLICKHOUSE_CA_CERT_PATH,
      cert: process.env.CLICKHOUSE_CLIENT_CERT_PATH,
      key: process.env.CLICKHOUSE_CLIENT_KEY_PATH,
    }

    for (const [type, path] of Object.entries(envPaths)) {
      if (path && this.fileExists(path)) {
        try {
          this.certificates[type as keyof CertificateConfig] = readFileSync(path, 'utf8')
          // Certificate loaded successfully
        } catch (error) {
          console.warn(`Failed to load ${type} certificate from ${path}:`, error.message)
        }
      }
    }
  }

  private loadServiceAccountCA(): void {
    if (this.certificates.ca) return // Already loaded from env

    const serviceAccountPaths = [
      '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt',
      '/run/secrets/kubernetes.io/serviceaccount/ca.crt'
    ]

    for (const path of serviceAccountPaths) {
      if (this.fileExists(path)) {
        try {
          this.certificates.ca = readFileSync(path, 'utf8')
          break
        } catch (error) {
          // Failed to load service account CA, continue trying other paths
        }
      }
    }
  }

  private loadMountedCertificates(): void {
    // Common OpenShift patterns for mounted certificates
    const mountPaths = [
      '/etc/ssl/certs/clickhouse',
      '/etc/certs/clickhouse',
      '/var/certs/clickhouse',
      '/opt/app-root/certs',
    ]

    for (const basePath of mountPaths) {
      if (!this.certificates.ca && this.fileExists(join(basePath, 'ca.crt'))) {
        try {
          this.certificates.ca = readFileSync(join(basePath, 'ca.crt'), 'utf8')
          // CA certificate loaded from mounted path
        } catch (error) {
          // Failed to load CA certificate from mounted path
        }
      }

      if (!this.certificates.cert && this.fileExists(join(basePath, 'tls.crt'))) {
        try {
          this.certificates.cert = readFileSync(join(basePath, 'tls.crt'), 'utf8')
          // Client certificate loaded from mounted path
        } catch (error) {
          // Failed to load client certificate from mounted path
        }
      }

      if (!this.certificates.key && this.fileExists(join(basePath, 'tls.key'))) {
        try {
          this.certificates.key = readFileSync(join(basePath, 'tls.key'), 'utf8')
          // Client key loaded from mounted path
        } catch (error) {
          // Failed to load client key from mounted path
        }
      }
    }
  }

  private fileExists(path: string): boolean {
    try {
      readFileSync(path)
      return true
    } catch {
      return false
    }
  }

  public getCertificates(): CertificateConfig {
    return { ...this.certificates }
  }

  public hasCertificates(): boolean {
    return !!(this.certificates.ca || this.certificates.cert || this.certificates.key)
  }

  public validateCertificates(): { valid: boolean; issues: string[] } {
    const issues: string[] = []

    // Check if we have mutual TLS setup (both cert and key)
    if (this.certificates.cert && !this.certificates.key) {
      issues.push('Client certificate found but no private key')
    }
    if (this.certificates.key && !this.certificates.cert) {
      issues.push('Private key found but no client certificate')
    }

    // Warn if no CA certificate in production
    if (process.env.NODE_ENV === 'production' && !this.certificates.ca) {
      issues.push('No CA certificate found in production environment')
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  public logStatus(): void {
    const config = this.getCertificates()
    console.log('📋 ClickHouse Certificate Status:')
    console.log(`   CA Certificate: ${config.ca ? '✅ Loaded' : '❌ Not found'}`)
    console.log(`   Client Certificate: ${config.cert ? '✅ Loaded' : '❌ Not found'}`)
    console.log(`   Client Key: ${config.key ? '✅ Loaded' : '❌ Not found'}`)
    
    const validation = this.validateCertificates()
    if (!validation.valid) {
      console.warn('⚠️  Certificate validation issues:')
      validation.issues.forEach(issue => console.warn(`   - ${issue}`))
    }
  }
}

// Export singleton instance
export const certificateManager = new CertificateManager()

// Utility function to get certificates
export function getCertificateConfig(): CertificateConfig {
  return certificateManager.getCertificates()
}

// Utility function for OpenShift deployment setup
export function setupOpenShiftCertificates(): void {
  console.log('🔧 Setting up certificates for OpenShift deployment...')
  certificateManager.logStatus()
  
  const validation = certificateManager.validateCertificates()
  if (!validation.valid && process.env.NODE_ENV === 'production') {
    console.error('❌ Certificate validation failed in production:')
    validation.issues.forEach(issue => console.error(`   - ${issue}`))
    
    // In production, we might want to fail fast
    if (process.env.STRICT_TLS_VALIDATION === 'true') {
      throw new Error('TLS certificate validation failed')
    }
  }
}