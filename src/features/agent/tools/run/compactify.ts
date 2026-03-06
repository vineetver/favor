/**
 * compactify.ts — Compact Run tool output for model context.
 *
 * execute() returns full data for the frontend (p.output).
 * toModelOutput calls compactRunForModel to give the model a trimmed view:
 *   - status + text_summary (always)
 *   - top-K preview of large arrays
 *   - _truncation metadata when data was trimmed
 *   - state_delta / artifacts / next_reads pass through
 *   - trace / warnings / candidates / suggested_next / budgets_remaining pass through
 */

import type { RunResult, NextAction } from "./types";
import { humanEdgeLabel, humanScoreLabel } from "./handlers/graph";

interface TruncationInfo {
  truncated: true;
  returned: number;
  total: number;
  reason?: "max_rows" | "max_points" | "token_budget" | "detail_level";
  how_to_get_more?: NextAction;
  hint?: string;
}

// Backwards-compatible alias
type Truncation = TruncationInfo;

/** Cast to satisfy ToolResultOutput's JSONValue constraint */
type CompactValue = { type: "json"; value: null };

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function compactRunForModel(
  command: string,
  result: RunResult,
): CompactValue {
  if (result.status === "error" || result.data?.error) {
    return json(result);
  }

  const compactor = COMPACTORS[command];
  if (!compactor) return json(buildEnvelope(result));

  const compactData = compactor(result.data ?? {});
  return json(buildEnvelope(result, compactData));
}

/** Build the model-facing envelope with all new fields */
function buildEnvelope(
  result: RunResult,
  compactData?: Record<string, unknown>,
): Record<string, unknown> {
  const envelope: Record<string, unknown> = {
    status: result.status,
    text_summary: result.text_summary,
    data: compactData ?? result.data,
    state_delta: result.state_delta,
  };

  if (result.artifacts?.length) envelope.artifacts = result.artifacts;
  if (result.next_reads?.length) envelope.next_reads = result.next_reads;
  if (result.warnings?.length) envelope.warnings = result.warnings;
  if (result.trace?.length) envelope.trace = result.trace;
  if (result.candidates?.length) envelope.candidates = result.candidates;
  if (result.resolved_info) envelope.resolved_info = result.resolved_info;
  if (result.suggested_next?.length) envelope.suggested_next = result.suggested_next;
  if (result.budgets_remaining) envelope.budgets_remaining = result.budgets_remaining;
  if (result.error) envelope.error = result.error;
  if (result.repairs?.length) envelope.repairs = result.repairs;
  if (result.next_actions?.length) envelope.next_actions = result.next_actions;
  if (result.incomplete) {
    envelope.incomplete = true;
    if (result.next_cursor != null) envelope.next_cursor = result.next_cursor;
  }

  return envelope;
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
  analytics: compactAnalytics,
  // Workflow compactors
  top_hits: compactTopHits,
  qc_summary: passthrough,
  gwas_minimal: compactGwasMinimal,
  variant_profile: compactVariantProfile,
  compare_cohorts: passthrough,
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
      relationship: humanEdgeLabel(branch.edgeType),
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
  if (data.relationship) out.relationship = data.relationship;
  else if (data.edgeType) out.relationship = humanEdgeLabel(data.edgeType as string);
  if (data.metric) out.metric = data.metric;
  if (data.value !== undefined) out.value = data.value;
  if (data.buckets) {
    const buckets = asArray(data.buckets);
    out.buckets = buckets.slice(0, 10);
    if (buckets.length > 10) {
      out._truncation = truncation(10, buckets.length);
    }
  }
  // Pass through compare results
  if (data.comparisons) out.comparisons = data.comparisons;
  if (data.overallSimilarity) out.overallSimilarity = data.overallSimilarity;
  if (data.sharedNeighbors) {
    const shared = asArray(data.sharedNeighbors);
    out.sharedNeighbors = shared.slice(0, 10);
    if (shared.length > 10) {
      out._truncation = truncation(10, shared.length);
    }
  }
  // Pass through context entities
  if (data.entities) {
    const entities = asArray(data.entities);
    out.entities = entities.slice(0, 3);
    if (entities.length > 3) {
      out._truncation = truncation(3, entities.length);
    }
  }
  // Pass through similar results
  if (data.similar) {
    const similar = asArray(data.similar);
    out.similar = similar.slice(0, 5);
    if (similar.length > 5) {
      out._truncation = truncation(5, similar.length);
    }
  }
  // Pass through method description
  if (data._method) out._method = data._method;
  return out;
}

function compactTraverse(data: Record<string, unknown>): Record<string, unknown> {
  // Chain mode
  const steps = data.steps as Array<{
    intent: string;
    edgeType?: string;
    count: number;
    top: unknown[];
    edgeDescription?: string;
    scoreField?: string;
  }> | undefined;
  if (steps) {
    const TOP_K = 10;
    return {
      seed: data.seed,
      steps: steps.map((s) => {
        // Build human-readable relationship from edgeDescription label or edgeType
        const relationship = s.edgeDescription
          ? s.edgeDescription.replace(/:.*$/, "").trim()
          : s.edgeType
            ? humanEdgeLabel(s.edgeType)
            : undefined;
        const scoreContext = s.scoreField
          ? humanScoreLabel(s.scoreField)
          : undefined;
        // Preserve numeric scores on entities so the LLM can rank/report them
        const topEntities = asArray(s.top).slice(0, TOP_K).map((e) => {
          const ent = e as Record<string, unknown>;
          const out: Record<string, unknown> = {
            type: ent.type,
            id: ent.id,
            label: ent.label,
            subtitle: ent.subtitle,
          };
          if (ent.rank != null) out.rank = ent.rank;
          if (typeof ent.score === "number") out.score = Math.round(ent.score * 10000) / 10000;
          if (typeof ent.pValue === "number") out.pValue = ent.pValue;
          if (typeof ent.foldEnrichment === "number") out.foldEnrichment = ent.foldEnrichment;
          return out;
        });
        return {
          intent: s.intent,
          count: s.count,
          ...(relationship ? { relationship } : {}),
          ...(scoreContext ? { scoreContext } : {}),
          top: topEntities,
          ...(s.top.length > TOP_K ? { _truncation: truncation(TOP_K, s.top.length) } : {}),
        };
      }),
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

function compactAnalytics(data: Record<string, unknown>): Record<string, unknown> {
  const charts = asArray(data.charts);
  // Keep chart metadata (type, title, chart_id) but strip raw point arrays
  // The frontend already has the full data from p.output; model only needs summaries
  const compactCharts = charts.map((c) => {
    const chart = c as Record<string, unknown>;
    const chartData = chart.data as Record<string, unknown> | undefined;
    const pointCount = chartData
      ? (asArray(chartData.points).length || asArray(chartData.bars).length || 0)
      : 0;
    return {
      chart_id: chart.chart_id,
      chart_type: chart.chart_type,
      title: chart.title,
      point_count: pointCount,
    };
  });

  return {
    taskType: data.taskType,
    runId: data.runId,
    summary: data.summary,
    metrics: data.metrics,
    charts: compactCharts,
    _cohort: data._cohort,
  };
}

// ---------------------------------------------------------------------------
// Workflow compactors
// ---------------------------------------------------------------------------

function passthrough(data: Record<string, unknown>): Record<string, unknown> {
  return data;
}

function compactTopHits(data: Record<string, unknown>): Record<string, unknown> {
  const rows = asArray(data.rows);
  const totalRanked = asNumber(data.total_ranked, rows.length);
  const top = rows.slice(0, 10);

  const out: Record<string, unknown> = {
    criteria: data.criteria,
    rows: top,
    total_ranked: totalRanked,
  };
  if (data.filtered_count !== undefined) out.filtered_count = data.filtered_count;
  if (rows.length > 10) {
    out._truncation = truncation(10, totalRanked, "max_rows", {
      tool: "Run",
      args: { command: "rows", sort: "composite_score", desc: true, limit: 50 },
      reason: "Fetch more ranked variants",
    });
  }
  return out;
}

function compactGwasMinimal(data: Record<string, unknown>): Record<string, unknown> {
  const topHits = asArray(data.top_hits).slice(0, 10);
  return {
    p_column: data.p_column,
    correction: data.correction,
    qc: data.qc,
    top_hits: topHits,
    total_variants: data.total_variants,
  };
}

function compactVariantProfile(data: Record<string, unknown>): Record<string, unknown> {
  const profiles = asArray(data.profiles).slice(0, 5);
  const out: Record<string, unknown> = { profiles };
  if (data.cohort_rows) {
    out.cohort_rows = asArray(data.cohort_rows).slice(0, 5);
  }
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

function truncation(
  returned: number,
  total: number,
  reason?: TruncationInfo["reason"] | string,
  how_to_get_more?: NextAction,
): TruncationInfo {
  // When called with old 3-arg signature (returned, total, hint_string)
  if (typeof reason === "string" && !["max_rows", "max_points", "token_budget", "detail_level"].includes(reason)) {
    return { truncated: true, returned, total, hint: reason };
  }
  return {
    truncated: true,
    returned,
    total,
    ...(reason ? { reason: reason as TruncationInfo["reason"] } : {}),
    ...(how_to_get_more ? { how_to_get_more } : {}),
  };
}
