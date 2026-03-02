/**
 * compactify.ts — Compact Run tool output for model context.
 *
 * execute() returns full data for the frontend (p.output).
 * toModelOutput calls compactRunForModel to give the model a trimmed view:
 *   - text_summary (always)
 *   - top-K preview of large arrays
 *   - _truncation metadata when data was trimmed
 *   - state_delta / artifacts / next_reads pass through
 */

import type { RunResult } from "./types";

interface Truncation {
  truncated: true;
  returned: number;
  total: number;
  hint?: string;
}

/** Cast to satisfy ToolResultOutput's JSONValue constraint */
type CompactValue = { type: "json"; value: null };

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function compactRunForModel(
  command: string,
  result: RunResult,
): CompactValue {
  if (result.data?.error) {
    return json(result);
  }

  const compactor = COMPACTORS[command];
  if (!compactor) return json(result);

  const compactData = compactor(result.data);
  return json({
    text_summary: result.text_summary,
    data: compactData,
    ...(result.artifacts?.length ? { artifacts: result.artifacts } : {}),
    state_delta: result.state_delta,
    ...(result.next_reads?.length ? { next_reads: result.next_reads } : {}),
  });
}

// ---------------------------------------------------------------------------
// Per-command compactors
// ---------------------------------------------------------------------------

type Compactor = (data: Record<string, unknown>) => Record<string, unknown>;

const COMPACTORS: Record<string, Compactor> = {
  rows: compactRows,
  groupby: compactGroupby,
  prioritize: compactPrioritize,
  compute: compactCompute,
  explore: compactExplore,
  traverse: compactTraverse,
  query: compactQuery,
};

function compactRows(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const total = asNumber(data.total, rows.length);
  const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];

  // Respect user-requested limits: only truncate if > 10 rows
  if (rows.length <= 10) {
    return { rows, total, columns };
  }
  return {
    rows,
    total,
    columns,
    _truncation: truncation(rows.length, total),
  };
}

function compactGroupby(data: Record<string, unknown>): Record<string, unknown> {
  const buckets = asArray(data.buckets);
  const totalGroups = asNumber(data.total_groups, buckets.length);
  const top = buckets.slice(0, 10);

  const out: Record<string, unknown> = {
    group_by: data.group_by,
    buckets: top,
    total_groups: totalGroups,
  };
  if (buckets.length > 10) {
    out.otherBucketsCount = buckets.length - 10;
    out._truncation = truncation(10, buckets.length, "use groupby with filters to narrow");
  }
  return out;
}

function compactPrioritize(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalRanked = asNumber(data.total_ranked, rows.length);
  const top = rows.slice(0, 5);

  const out: Record<string, unknown> = {
    criteria: data.criteria,
    rows: top,
    total_ranked: totalRanked,
  };
  if (rows.length > 5) {
    out._truncation = truncation(5, rows.length);
  }
  return out;
}

function compactCompute(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalScored = asNumber(data.total_scored, rows.length);
  const top = rows.slice(0, 5);

  const out: Record<string, unknown> = {
    rows: top,
    total_scored: totalScored,
  };
  if (rows.length > 5) {
    out._truncation = truncation(5, rows.length);
  }
  return out;
}

function compactExplore(data: Record<string, unknown>): Record<string, unknown> {
  const results = data.results as Record<string, { count: number; edgeType: string; top: unknown[] }> | undefined;
  if (!results) return data;

  const compactResults: Record<string, unknown> = {};
  for (const [key, branch] of Object.entries(results)) {
    const top = asArray(branch.top).slice(0, 5);
    compactResults[key] = {
      count: branch.count,
      edgeType: branch.edgeType,
      top,
      ...(branch.top.length > 5 ? { _truncation: truncation(5, branch.top.length, "explore with narrower intent for more") } : {}),
    };
  }

  const out: Record<string, unknown> = {
    results: compactResults,
    resolved_seeds: data.resolved_seeds,
  };
  // Pass through enrichment if present (already reasonably sized)
  if (data.enrichment) out.enrichment = data.enrichment;
  // Pass through aggregate data (already small)
  if (data.seed) out.seed = data.seed;
  if (data.edgeType) out.edgeType = data.edgeType;
  if (data.metric) out.metric = data.metric;
  if (data.value !== undefined) out.value = data.value;
  if (data.buckets) {
    const buckets = asArray(data.buckets);
    out.buckets = buckets.slice(0, 10);
    if (buckets.length > 10) {
      out._truncation = truncation(10, buckets.length);
    }
  }
  return out;
}

function compactTraverse(data: Record<string, unknown>): Record<string, unknown> {
  // Chain mode
  const steps = data.steps as Array<{ intent: string; count: number; top: unknown[] }> | undefined;
  if (steps) {
    return {
      seed: data.seed,
      steps: steps.map((s) => ({
        intent: s.intent,
        count: s.count,
        top: asArray(s.top).slice(0, 5),
        ...(s.top.length > 5 ? { _truncation: truncation(5, s.top.length) } : {}),
      })),
    };
  }

  // Paths mode — already compact (path nodes are essential)
  return data;
}

function compactQuery(data: Record<string, unknown>): Record<string, unknown> {
  const matches = asArray(data.matches);
  const totalMatches = asNumber(data.totalMatches, matches.length);
  const top = matches.slice(0, 5);

  const out: Record<string, unknown> = {
    pattern: data.pattern,
    matches: top,
    totalMatches,
  };
  if (matches.length > 5) {
    out._truncation = truncation(5, matches.length, "add filters or narrow pattern for more");
  }
  // Strip the large `nodes` map — model doesn't need it
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(value: unknown): CompactValue {
  return { type: "json", value: value as null };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" ? v : fallback;
}

function truncation(returned: number, total: number, hint?: string): Truncation {
  return { truncated: true, returned, total, ...(hint ? { hint } : {}) };
}
