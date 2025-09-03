/**
 * ClickHouse Setup and Connection Utilities
 * 
 * Utilities for setting up and testing secure ClickHouse connections,
 * particularly for OpenShift/Kubernetes deployments.
 */

import { clickHouseClient, testClickHouseConnection } from './client'
import { certificateManager, setupOpenShiftCertificates } from './certificates'

export async function setupClickHouse(): Promise<boolean> {
  console.log('🚀 Setting up ClickHouse secure connection...')
  
  try {
    // Setup certificates for OpenShift
    setupOpenShiftCertificates()
    
    // Test the connection
    console.log('🔍 Testing ClickHouse connection...')
    const isConnected = await testClickHouseConnection()
    
    if (isConnected) {
      console.log('✅ ClickHouse setup successful!')
      
      // Run a simple query test
      console.log('🧪 Running connection test query...')
      const result = await clickHouseClient.query<{version: string, timestamp: string}>({
        query: 'SELECT version() as version, now() as timestamp',
      })
      
      if (Array.isArray(result) && result.length > 0) {
        console.log('📊 ClickHouse version:', result[0]?.version)
        console.log('🕐 Server time:', result[0]?.timestamp)
      }
      
      return true
    } else {
      console.error('❌ ClickHouse setup failed - connection test failed')
      return false
    }
  } catch (error) {
    console.error('❌ ClickHouse setup error:', error)
    return false
  }
}

export function printConnectionInfo(): void {
  console.log('\n📋 ClickHouse Connection Configuration:')
  console.log(`   URL: ${process.env.CLICKHOUSE_URL || 'Not set'}`)
  console.log(`   User: ${process.env.CLICKHOUSE_USER || 'default'}`)
  console.log(`   Database: ${process.env.CLICKHOUSE_DATABASE || 'production'}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  
  certificateManager.logStatus()
  
  console.log('\n🔧 OpenShift/Kubernetes Certificate Paths:')
  console.log('   Service Account CA: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt')
  console.log('   Mounted Certs: /etc/ssl/certs/clickhouse/, /etc/certs/clickhouse/')
  console.log('   Custom Paths: Set CLICKHOUSE_*_CERT_PATH environment variables')
}

export async function diagnoseConnection(): Promise<void> {
  console.log('🔍 Diagnosing ClickHouse connection...\n')
  
  printConnectionInfo()
  
  console.log('\n🧪 Connection Tests:')
  
  try {
    console.log('1. Testing basic connectivity...')
    const pingResult = await clickHouseClient.ping()
    console.log(`   Result: ${pingResult ? '✅ Success' : '❌ Failed'}`)
    
    if (pingResult) {
      console.log('2. Testing query execution...')
      const queryResult = await clickHouseClient.query<{test_value: number}>({
        query: 'SELECT 1 as test_value',
      })
      console.log(`   Result: ${Array.isArray(queryResult) && queryResult.length > 0 ? '✅ Success' : '❌ Failed'}`)
      
      console.log('3. Testing database access...')
      const dbResult = await clickHouseClient.query({
        query: 'SHOW TABLES LIMIT 1',
      })
      console.log(`   Result: ${dbResult ? '✅ Success' : '❌ Failed'}`)
    }
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  }
}

// For kubectl/OpenShift usage
export function printKubernetesCertificateCommands(): void {
  console.log('\n🐳 Kubernetes/OpenShift Certificate Setup Commands:')
  console.log('\n# Create a secret with ClickHouse certificates:')
  console.log('kubectl create secret generic clickhouse-certs \\')
  console.log('  --from-file=ca.crt=/path/to/ca.crt \\')
  console.log('  --from-file=tls.crt=/path/to/client.crt \\')
  console.log('  --from-file=tls.key=/path/to/client.key')
  
  console.log('\n# Mount the secret in your deployment:')
  console.log('# Add to your deployment.yaml:')
  console.log('spec:')
  console.log('  template:')
  console.log('    spec:')
  console.log('      volumes:')
  console.log('      - name: clickhouse-certs')
  console.log('        secret:')
  console.log('          secretName: clickhouse-certs')
  console.log('      containers:')
  console.log('      - name: app')
  console.log('        volumeMounts:')
  console.log('        - name: clickhouse-certs')
  console.log('          mountPath: /etc/certs/clickhouse')
  console.log('          readOnly: true')
  
  console.log('\n# Or set environment variables:')
  console.log('env:')
  console.log('- name: CLICKHOUSE_CA_CERT_PATH')
  console.log('  value: /etc/certs/clickhouse/ca.crt')
  console.log('- name: CLICKHOUSE_CLIENT_CERT_PATH')
  console.log('  value: /etc/certs/clickhouse/tls.crt')
  console.log('- name: CLICKHOUSE_CLIENT_KEY_PATH')
  console.log('  value: /etc/certs/clickhouse/tls.key')
}

// CLI interface when run directly
if (require.main === module) {
  const command = process.argv[2] || 'setup'
  
  switch (command) {
    case 'setup':
      setupClickHouse().then(success => {
        process.exit(success ? 0 : 1)
      })
      break
      
    case 'diagnose':
      diagnoseConnection().then(() => {
        process.exit(0)
      })
      break
      
    case 'info':
      printConnectionInfo()
      break
      
    case 'k8s-help':
      printKubernetesCertificateCommands()
      break
      
    default:
      console.log('Usage: node setup.ts [setup|diagnose|info|k8s-help]')
      console.log('  setup    - Setup and test ClickHouse connection')
      console.log('  diagnose - Run connection diagnostics')
      console.log('  info     - Show connection configuration')
      console.log('  k8s-help - Show Kubernetes certificate setup commands')
      break
  }
}