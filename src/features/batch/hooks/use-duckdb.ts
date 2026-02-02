"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as duckdb from "@duckdb/duckdb-wasm";
import {
  getCachedParquet,
  setCachedParquet,
  clearParquetCache,
} from "../lib/parquet-cache";

// ============================================================================
// Types
// ============================================================================

export interface DuckDBInstance {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface LoadParquetResult {
  fromCache: boolean;
  size: number;
}

export interface UseDuckDBResult {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  loadParquet: (url: string, tableName?: string) => Promise<LoadParquetResult>;
  query: (sql: string) => Promise<QueryResult>;
  getTableSchema: (tableName: string) => Promise<QueryResult>;
  getTables: () => Promise<string[]>;
  clearCache: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDuckDB(): UseDuckDBResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

        // Install and load httpfs for remote parquet files
        await conn.query(`INSTALL httpfs`);
        await conn.query(`LOAD httpfs`);

        const instance = { db, conn };
        instanceRef.current = instance;

        return instance;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to initialize DuckDB";
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
        if (mounted) {
          setIsReady(true);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [initDuckDB]);

  // Load parquet file from URL (with IndexedDB caching)
  const loadParquet = useCallback(async (url: string, tableName = "variants"): Promise<LoadParquetResult> => {
    const instance = await initDuckDB();

    try {
      let arrayBuffer: ArrayBuffer;
      let fromCache = false;

      // Check IndexedDB cache first
      const cached = await getCachedParquet(url);

      if (cached) {
        // Use cached data
        arrayBuffer = cached;
        fromCache = true;
        console.log(`[DuckDB] Loaded parquet from cache (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        // Fetch the parquet file via browser fetch
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch parquet file: ${response.status} ${response.statusText}`);
        }

        // Get the file as ArrayBuffer
        arrayBuffer = await response.arrayBuffer();
        console.log(`[DuckDB] Fetched parquet from network (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);

        // Store in cache for next time (don't await - do it in background)
        setCachedParquet(url, arrayBuffer).catch((err) => {
          console.warn("[DuckDB] Failed to cache parquet:", err);
        });
      }

      const uint8Array = new Uint8Array(arrayBuffer);

      // Register the file with DuckDB
      await instance.db.registerFileBuffer("data.parquet", uint8Array);

      // Create table from the registered parquet file
      await instance.conn.query(`
        CREATE OR REPLACE TABLE ${tableName} AS
        SELECT * FROM read_parquet('data.parquet')
      `);

      return {
        fromCache,
        size: arrayBuffer.byteLength,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load parquet file";
      throw new Error(message);
    }
  }, [initDuckDB]);

  // Clear the parquet cache
  const clearCache = useCallback(async () => {
    await clearParquetCache();
    console.log("[DuckDB] Parquet cache cleared");
  }, []);

  // Execute SQL query
  const query = useCallback(async (sql: string): Promise<QueryResult> => {
    const instance = await initDuckDB();

    try {
      const result = await instance.conn.query(sql);
      const columns = result.schema.fields.map((f) => f.name);
      const rows: Record<string, unknown>[] = [];

      // Convert Arrow table to array of objects
      for (let i = 0; i < result.numRows; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          const value = result.getChild(col)?.get(i);
          // Handle BigInt conversion
          row[col] = typeof value === "bigint" ? Number(value) : value;
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
  }, [initDuckDB]);

  // Get table schema
  const getTableSchema = useCallback(async (tableName: string): Promise<QueryResult> => {
    return query(`DESCRIBE ${tableName}`);
  }, [query]);

  // Get list of tables
  const getTables = useCallback(async (): Promise<string[]> => {
    const result = await query(`SHOW TABLES`);
    return result.rows.map((r) => r.name as string);
  }, [query]);

  return {
    isLoading,
    isReady,
    error,
    loadParquet,
    query,
    getTableSchema,
    getTables,
    clearCache,
  };
}
