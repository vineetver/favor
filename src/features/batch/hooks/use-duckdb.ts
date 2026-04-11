"use client";

import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDataCache,
  getCachedData,
  setCachedData,
} from "../lib/data-cache";

// ============================================================================
// Types
// ============================================================================

export interface DuckDBInstance {
  db: AsyncDuckDB;
  conn: AsyncDuckDBConnection;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface LoadDataResult {
  fromCache: boolean;
  size: number;
}

export interface UseDuckDBResult {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  /**
   * Load a Parquet file into DuckDB from a URL.
   * @param url - Presigned URL to fetch (may expire)
   * @param tableName - DuckDB table/view name (default: "variants")
   * @param cacheKey - Stable key for IndexedDB cache. Use this to survive URL changes
   *                   (e.g. `cohort:${id}:data`). Falls back to `url` if omitted.
   */
  loadParquet: (
    url: string,
    tableName?: string,
    cacheKey?: string,
  ) => Promise<LoadDataResult>;
  query: (sql: string) => Promise<QueryResult>;
  getTableSchema: (tableName: string) => Promise<QueryResult>;
  getTables: () => Promise<string[]>;
  clearCache: () => Promise<void>;
}

type DuckDBStatus =
  | { type: "loading" }
  | { type: "ready" }
  | { type: "error"; message: string };

// ============================================================================
// Module-level singleton — allows logout to destroy in-memory tables
// ============================================================================

let sharedInstance: DuckDBInstance | null = null;

/** Tear down the in-memory DuckDB instance so no tables leak across user sessions. */
export async function destroyDuckDB(): Promise<void> {
  if (!sharedInstance) return;
  try {
    await sharedInstance.conn.close();
    await sharedInstance.db.terminate();
  } catch {
    // Best-effort cleanup
  }
  sharedInstance = null;
}

// ============================================================================
// Hook
// ============================================================================

export function useDuckDB(): UseDuckDBResult {
  const [status, setStatus] = useState<DuckDBStatus>({ type: "loading" });
  const instanceRef = useRef<DuckDBInstance | null>(null);
  const initPromiseRef = useRef<Promise<DuckDBInstance> | null>(null);

  // Initialize DuckDB
  const initDuckDB = useCallback(async (): Promise<DuckDBInstance> => {
    // Return existing promise if already initializing
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    // Return existing instance if ready
    if (instanceRef.current) {
      return instanceRef.current;
    }

    const initPromise = (async () => {
      try {
        // Runtime import — avoids webpack pulling in duckdb-node.cjs
        const duckdb = await import("@duckdb/duckdb-wasm");

        // Use jsdelivr CDN for bundles
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

        // Select best bundle for the browser
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

        if (!bundle.mainWorker) {
          throw new Error("No worker bundle available");
        }

        // Fetch the worker script and create a blob URL to avoid CORS issues
        const workerResponse = await fetch(bundle.mainWorker);
        const workerBlob = await workerResponse.blob();
        const workerUrl = URL.createObjectURL(workerBlob);

        // Create worker from blob URL
        const worker = new Worker(workerUrl);
        const logger = new duckdb.ConsoleLogger();

        // Instantiate DuckDB
        const db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

        // Create connection
        const conn = await db.connect();

        // Install and load httpfs for remote files
        await conn.query(`INSTALL httpfs`);
        await conn.query(`LOAD httpfs`);

        const instance = { db, conn };
        instanceRef.current = instance;
        sharedInstance = instance;

        return instance;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize DuckDB";
        throw new Error(message);
      }
    })();

    initPromiseRef.current = initPromise;
    return initPromise;
  }, []);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    initDuckDB()
      .then(() => {
        if (mounted) setStatus({ type: "ready" });
      })
      .catch((err) => {
        if (mounted) setStatus({ type: "error", message: err.message });
      });

    return () => {
      mounted = false;
    };
  }, [initDuckDB]);

  // Load Parquet file from URL (with IndexedDB caching)
  const loadParquet = useCallback(
    async (
      url: string,
      tableName = "variants",
      cacheKey?: string,
    ): Promise<LoadDataResult> => {
      const instance = await initDuckDB();
      // Use stable cacheKey when provided so the cache survives presigned URL changes
      const effectiveCacheKey = cacheKey ?? url;

      try {
        let arrayBuffer: ArrayBuffer;
        let fromCache = false;

        // Check IndexedDB cache first (keyed by stable cacheKey, not ephemeral URL)
        const cached = await getCachedData(effectiveCacheKey);

        if (cached) {
          arrayBuffer = cached;
          fromCache = true;
          console.log(
            `[DuckDB] Loaded Parquet from cache (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`,
          );
        } else {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch Parquet file: ${response.status} ${response.statusText}`,
            );
          }

          arrayBuffer = await response.arrayBuffer();
          console.log(
            `[DuckDB] Fetched Parquet from network (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`,
          );

          // Store in cache with stable key (don't await - do it in background)
          setCachedData(effectiveCacheKey, arrayBuffer).catch((err) => {
            console.warn("[DuckDB] Failed to cache Parquet data:", err);
          });
        }

        const uint8Array = new Uint8Array(arrayBuffer);

        // Use a unique virtual filename per table to avoid buffer collisions
        // when loading multiple parquets sequentially.
        const virtualFile = `${tableName}.parquet`;
        await instance.db.registerFileBuffer(virtualFile, uint8Array);

        // Check if the parquet has a nested "variant" struct (new schema).
        // If so, unnest it into a flat view for backward compat with all queries.
        const rawTable = `_raw_${tableName}`;
        await instance.conn.query(`
        CREATE OR REPLACE TABLE ${rawTable} AS
        SELECT * FROM read_parquet('${virtualFile}')
      `);

        // Detect variant struct column
        const schemaResult = await instance.conn.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = '${rawTable}' AND column_name = 'variant'`,
        );
        const hasVariantStruct = schemaResult.numRows > 0;

        if (hasVariantStruct) {
          await instance.conn.query(`
          CREATE OR REPLACE VIEW ${tableName} AS
          SELECT * EXCLUDE (variant), variant.* FROM ${rawTable}
        `);
        } else {
          // No nesting — alias directly
          await instance.conn.query(`
          CREATE OR REPLACE VIEW ${tableName} AS SELECT * FROM ${rawTable}
        `);
        }

        return {
          fromCache,
          size: arrayBuffer.byteLength,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load Parquet file";
        throw new Error(message);
      }
    },
    [initDuckDB],
  );

  // Clear the data cache
  const clearCache = useCallback(async () => {
    await clearDataCache();
    console.log("[DuckDB] Data cache cleared");
  }, []);

  // Execute SQL query
  const query = useCallback(
    async (sql: string): Promise<QueryResult> => {
      const instance = await initDuckDB();

      try {
        const result = await instance.conn.query(sql);
        const columns = result.schema.fields.map((f) => f.name);

        // Convert Arrow value to plain JS object, handling nested structs and BigInt
        const convertValue = (value: unknown): unknown => {
          if (value === null || value === undefined) return value;
          if (typeof value === "bigint") return Number(value);
          if (Array.isArray(value)) return value.map(convertValue);
          // Handle Arrow Struct rows - they have toJSON method
          if (typeof value === "object" && value !== null) {
            if (
              "toJSON" in value &&
              typeof (value as { toJSON: unknown }).toJSON === "function"
            ) {
              return convertValue(
                (value as { toJSON: () => unknown }).toJSON(),
              );
            }
            // Handle Map-like objects from Arrow
            if (value instanceof Map) {
              const obj: Record<string, unknown> = {};
              value.forEach((v, k) => {
                obj[String(k)] = convertValue(v);
              });
              return obj;
            }
            // Handle plain objects recursively
            const obj: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
              obj[k] = convertValue(v);
            }
            return obj;
          }
          return value;
        };

        const rows: Record<string, unknown>[] = [];

        // Convert Arrow table to array of objects
        for (let i = 0; i < result.numRows; i++) {
          const row: Record<string, unknown> = {};
          for (const col of columns) {
            const value = result.getChild(col)?.get(i);
            row[col] = convertValue(value);
          }
          rows.push(row);
        }

        return {
          columns,
          rows,
          rowCount: result.numRows,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Query failed";
        throw new Error(message);
      }
    },
    [initDuckDB],
  );

  // Get table schema
  const getTableSchema = useCallback(
    async (tableName: string): Promise<QueryResult> => {
      return query(`DESCRIBE ${tableName}`);
    },
    [query],
  );

  // Get list of tables
  const getTables = useCallback(async (): Promise<string[]> => {
    const result = await query(`SHOW TABLES`);
    return result.rows.map((r) => r.name as string);
  }, [query]);

  return {
    isLoading: status.type === "loading",
    isReady: status.type === "ready",
    error: status.type === "error" ? status.message : null,
    loadParquet,
    query,
    getTableSchema,
    getTables,
    clearCache,
  };
}
