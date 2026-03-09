/**
 * schema-cache.ts — Cohort schema cache with fingerprint and TTL.
 *
 * Eliminates the "LLM forgot to read schema" failure class entirely.
 * Pre-gates auto-fetch schema before any cohort command that needs column validation.
 */

import { cohortFetch } from "../../lib/api-client";
import type { ColumnKind } from "./column-match";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortSchemaCache {
  cohortId: string;
  fetchedAt: number;
  schemaHash: string;
  dataType: string;
  rowCount: number;
  allColumnsWithKind: Array<{ name: string; kind: ColumnKind }>;
  allColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  identityColumns: string[];
  arrayColumns: string[];
  availableMethods: string[];
}

export interface CohortFingerprint {
  cohort_id: string;
  data_type: string;
  schema_hash: string;
  row_count: number;
}

// ---------------------------------------------------------------------------
// Internal columns to filter
// ---------------------------------------------------------------------------

const INTERNAL_COLUMNS = new Set([
  "variants_vid",
  "variants_chrom_id",
  "variants_position0",
  "variants_hash30",
  "variants_pos_bin_1m",
  "variants_is_hashed",
  "variants_position",
  "row_id",
]);

// ---------------------------------------------------------------------------
// FNV-1a hash (32-bit, for schema fingerprinting)
// ---------------------------------------------------------------------------

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

const cache = new Map<string, CohortSchemaCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached schema if fresh, otherwise return undefined.
 */
export function getCachedSchema(cohortId: string): CohortSchemaCache | undefined {
  const entry = cache.get(cohortId);
  if (!entry) return undefined;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(cohortId);
    return undefined;
  }
  return entry;
}

/**
 * Fetch and cache the schema for a cohort.
 * Returns cached version if still fresh.
 */
export async function fetchAndCacheSchema(cohortId: string): Promise<CohortSchemaCache> {
  const existing = getCachedSchema(cohortId);
  if (existing) return existing;

  const raw = await cohortFetch<Record<string, unknown>>(
    `/cohorts/${encodeURIComponent(cohortId)}/schema`,
    { timeout: 30_000 },
  );

  const entry = parseSchemaResponse(cohortId, raw);
  cache.set(cohortId, entry);
  return entry;
}

/**
 * Get fingerprint from cached schema (for result enrichment).
 */
export function getFingerprint(schema: CohortSchemaCache): CohortFingerprint {
  return {
    cohort_id: schema.cohortId,
    data_type: schema.dataType,
    schema_hash: schema.schemaHash,
    row_count: schema.rowCount,
  };
}

// ---------------------------------------------------------------------------
// Parse backend schema response into CohortSchemaCache
// ---------------------------------------------------------------------------

function parseSchemaResponse(
  cohortId: string,
  raw: Record<string, unknown>,
): CohortSchemaCache {
  const numeric: string[] = [];
  const categorical: string[] = [];
  const identity: string[] = [];
  const array: string[] = [];
  const allWithKind: Array<{ name: string; kind: ColumnKind }> = [];

  // Parse columns — prefer raw.columns (already filtered by backend), fall back to auto_config
  const autoConfig = raw.auto_config as Record<string, unknown> | undefined;
  const columns = (raw.columns ?? autoConfig?.columns) as
    | Array<{ name: string; kind?: string; type?: string }>
    | undefined;

  if (Array.isArray(columns)) {
    for (const col of columns) {
      if (INTERNAL_COLUMNS.has(col.name)) continue;

      const kind = classifyColumn(col);
      allWithKind.push({ name: col.name, kind });

      switch (kind) {
        case "numeric":
          numeric.push(col.name);
          break;
        case "categorical":
          categorical.push(col.name);
          break;
        case "identity":
          identity.push(col.name);
          break;
        case "array":
          array.push(col.name);
          break;
      }
    }
  }

  const allColumns = allWithKind.map((c) => c.name);
  const schemaHash = fnv1a(allColumns.slice().sort().join(","));

  // Extract available methods — may be string[] or {method, available}[]
  const rawMethods = (raw.available_methods ?? autoConfig?.available_methods) as
    | Array<string | { method: string; available: boolean }>
    | undefined;
  const availableMethods = Array.isArray(rawMethods)
    ? rawMethods.map((m) => (typeof m === "string" ? m : m.method)).filter(Boolean)
    : [];

  // Extract metadata
  const dataType =
    typeof raw.data_type === "string"
      ? raw.data_type
      : typeof raw.cohort_type === "string"
        ? raw.cohort_type
        : "unknown";

  const rowCount =
    typeof raw.row_count === "number"
      ? raw.row_count
      : typeof raw.vid_count === "number"
        ? raw.vid_count
        : 0;

  return {
    cohortId,
    fetchedAt: Date.now(),
    schemaHash,
    dataType,
    rowCount,
    allColumnsWithKind: allWithKind,
    allColumns,
    numericColumns: numeric,
    categoricalColumns: categorical,
    identityColumns: identity,
    arrayColumns: array,
    availableMethods,
  };
}

// ---------------------------------------------------------------------------
// Column kind classification
// ---------------------------------------------------------------------------

function classifyColumn(col: { name: string; kind?: string; type?: string }): ColumnKind {
  // Use explicit kind if provided
  if (col.kind === "numeric" || col.kind === "categorical" || col.kind === "identity" || col.kind === "array") {
    return col.kind;
  }

  // Infer from type
  const t = (col.type ?? "").toLowerCase();
  if (t.includes("int") || t.includes("float") || t.includes("double") || t.includes("numeric") || t.includes("decimal")) {
    return "numeric";
  }
  if (t.includes("varchar") || t.includes("string") || t.includes("text") || t.includes("enum")) {
    return "categorical";
  }

  // Infer from name patterns
  const name = col.name.toLowerCase();
  if (name.includes("_id") || name === "vid" || name === "rsid") return "identity";
  if (name.includes("_name") || name.includes("_type") || name === "consequence" || name === "chromosome") {
    return "categorical";
  }

  // Default to numeric (most cohort columns are scores)
  return "numeric";
}
