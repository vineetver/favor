import { createClient, ClickHouseClient } from "@clickhouse/client";

export interface ClickHouseConfig {
  url: string;
  username: string;
  password: string;
  database: string;
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

class SecureClickHouseClient {
  private client: ClickHouseClient | null = null;
  private config: ClickHouseConfig;

  constructor() {
    this.config = this.buildConfig();
  }

  private buildConfig(): ClickHouseConfig {
    const baseConfig: ClickHouseConfig = {
      url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER || "default",
      password: process.env.CLICKHOUSE_PASSWORD || "",
      database: process.env.CLICKHOUSE_DATABASE || "production",
    };

    // Add TLS configuration for secure connections (for encryption, not auth)
    if (baseConfig.url.startsWith("https://")) {
      baseConfig.tls = {
        rejectUnauthorized: false,
        ca: process.env.CLICKHOUSE_CA_CERT,
      };
    }

    return baseConfig;
  }

  private createSecureClient(): ClickHouseClient {
    const clientConfig: any = {
      url: this.config.url,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
      request_timeout: 30000,
      max_open_connections: 10,
      compression: {
        response: true,
        request: false,
      },
    };

    // Add TLS configuration if using HTTPS
    if (this.config.tls) {
      clientConfig.tls = this.config.tls;
    }

    return createClient(clientConfig);
  }

  public getClient(): ClickHouseClient {
    if (!this.client) {
      this.client = this.createSecureClient();
    }
    return this.client;
  }

  public async query<T = any>(params: {
    query: string;
    query_params?: Record<string, any>;
    format?: "JSONEachRow" | "JSON" | "CSV" | "TabSeparated";
    clickhouse_settings?: Record<string, any>;
  }): Promise<T[]> {
    const client = this.getClient();
    try {
      const result = await client.query({
        query: params.query,
        query_params: params.query_params,
        format: params.format || "JSONEachRow",
        clickhouse_settings: params.clickhouse_settings,
      });
      const data = await result.json<T[] | T[][]>();
      if (!Array.isArray(data)) return [];
      if (data.length === 0) return [];

      // Handle nested arrays by flattening
      if (Array.isArray(data[0])) {
        return (data as T[][]).flat();
      }

      return data as T[];
    } catch (error) {
      console.error("ClickHouse query error:", error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.query({ query: "SELECT 1", format: "JSONEachRow" });
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const clickHouseClient = new SecureClickHouseClient();

// Export function to get client instance (for backward compatibility)
export function getSecureClickHouseClient(): SecureClickHouseClient {
  return clickHouseClient;
}

// Utility function to test connection
export async function testClickHouseConnection(): Promise<boolean> {
  try {
    return await clickHouseClient.ping();
  } catch (error) {
    return false;
  }
}
