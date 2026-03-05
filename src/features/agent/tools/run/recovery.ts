/**
 * recovery.ts — Recovery recipes for cohort tool failures.
 *
 * Two recovery flows:
 * 1. Empty result recovery — data-driven selectivity probes to find which filter kills the set
 * 2. Column recovery re-exports from column-match.ts
 *
 * All recovery actions are tool-shaped (NextAction) so the LLM or runner can execute directly.
 */

import { cohortFetch } from "../../lib/api-client";
import type { CohortFilter } from "./types";

// ---------------------------------------------------------------------------
// NextAction — tool-shaped recovery/drill-down actions
// ---------------------------------------------------------------------------

export interface NextAction {
  tool: "Run" | "Read" | "Search" | "AskUser";
  args: Record<string, unknown>;
  reason: string;
  reason_code?: string;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Repair record — column auto-corrections
// ---------------------------------------------------------------------------

export interface Repair {
  field: string;
  received: string;
  corrected: string;
}

// ---------------------------------------------------------------------------
// Empty result recovery
// ---------------------------------------------------------------------------

export interface EmptyRecovery {
  culprit_filter?: CohortFilter;
  relaxed_filters: CohortFilter[];
  probe_results?: Array<{ filter_removed: CohortFilter; count: number }>;
  next_actions: NextAction[];
}

/**
 * Recover from empty results by probing which filter eliminates all rows.
 * Budget: max 2 cheap probes (limit:1, just reads total).
 */
export async function recoverEmptyResult(
  cohortId: string,
  filters: CohortFilter[],
  command: string,
): Promise<EmptyRecovery> {
  if (filters.length === 0) {
    return {
      relaxed_filters: [],
      next_actions: [
        {
          tool: "AskUser",
          args: { question: "This cohort has no data matching the query. What would you like to try?" },
          reason: "Empty cohort with no filters to relax",
          confidence: 0.5,
        },
      ],
    };
  }

  if (filters.length === 1) {
    return {
      culprit_filter: filters[0],
      relaxed_filters: [],
      next_actions: [
        {
          tool: "Run",
          args: { command, cohort_id: cohortId },
          reason: "Try without any filters",
          reason_code: "filter_relaxation",
          confidence: 0.9,
        },
        ...(isScoreFilter(filters[0])
          ? [
              {
                tool: "Run" as const,
                args: {
                  command,
                  cohort_id: cohortId,
                  filters: [relaxThreshold(filters[0])],
                },
                reason: `Relaxed ${(filters[0] as { field: string }).field} threshold by 50%`,
                reason_code: "threshold_relaxation",
                confidence: 0.7,
              },
            ]
          : []),
      ],
    };
  }

  // Multiple filters: probe to find the culprit
  const ranked = rankFiltersBySelectivity(filters);
  const probeResults: Array<{ filter_removed: CohortFilter; count: number }> = [];

  for (const suspect of ranked.slice(0, 2)) {
    const relaxed = filters.filter((f) => f !== suspect);
    try {
      const result = await cohortFetch<{ total?: number }>(
        `/cohorts/${encodeURIComponent(cohortId)}/rows`,
        { method: "POST", body: { filters: relaxed, limit: 1 }, timeout: 10_000 },
      );
      const count = typeof result.total === "number" ? result.total : 0;
      probeResults.push({ filter_removed: suspect, count });

      if (count > 0) {
        return {
          culprit_filter: suspect,
          relaxed_filters: relaxed,
          probe_results: probeResults,
          next_actions: [
            {
              tool: "Run",
              args: { command, cohort_id: cohortId, filters: relaxed },
              reason: `Removing ${describeFilter(suspect)} yields ${count} results`,
              reason_code: "filter_relaxation",
              confidence: 0.9,
            },
            ...(isScoreFilter(suspect)
              ? [
                  {
                    tool: "Run" as const,
                    args: {
                      command,
                      cohort_id: cohortId,
                      filters: filters.map((f) => (f === suspect ? relaxThreshold(suspect) : f)),
                    },
                    reason: `Relaxed ${(suspect as { field: string }).field} threshold by 50%`,
                    reason_code: "threshold_relaxation",
                    confidence: 0.7,
                  },
                ]
              : []),
          ],
        };
      }
    } catch {
      // Probe failed — skip, not critical
    }
  }

  // No culprit found — heuristic fallback
  return {
    relaxed_filters: filters.slice(0, -1),
    probe_results: probeResults,
    next_actions: [
      {
        tool: "Run",
        args: { command, cohort_id: cohortId, filters: [] },
        reason: "Try without all filters",
        reason_code: "filter_relaxation",
        confidence: 0.6,
      },
      {
        tool: "AskUser",
        args: {
          question: "No variants match these filters. Which filters should I relax?",
        },
        reason: "User guidance needed",
        confidence: 0.5,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

/** Rank filters by likely selectivity: score thresholds most likely to be too restrictive */
function rankFiltersBySelectivity(filters: CohortFilter[]): CohortFilter[] {
  const priority: Record<string, number> = {
    score_above: 0,
    score_below: 1,
    clinical_significance: 2,
    consequence: 3,
    gene: 4,
    chromosome: 5,
  };
  return [...filters].sort((a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99));
}

function isScoreFilter(filter: CohortFilter): filter is CohortFilter & { field: string; threshold: number } {
  return filter.type === "score_above" || filter.type === "score_below";
}

function relaxThreshold(filter: CohortFilter): CohortFilter {
  if (filter.type === "score_above") {
    return { ...filter, threshold: filter.threshold * 0.5 };
  }
  if (filter.type === "score_below") {
    return { ...filter, threshold: filter.threshold * 2 };
  }
  return filter;
}

export function describeFilter(filter: CohortFilter): string {
  switch (filter.type) {
    case "score_above":
      return `${filter.field} > ${filter.threshold}`;
    case "score_below":
      return `${filter.field} < ${filter.threshold}`;
    case "gene":
      return `gene in [${filter.values.join(", ")}]`;
    case "consequence":
      return `consequence in [${filter.values.join(", ")}]`;
    case "clinical_significance":
      return `clinical_significance in [${filter.values.join(", ")}]`;
    case "chromosome":
      return `chr ${filter.value}`;
    default:
      return JSON.stringify(filter);
  }
}

// ---------------------------------------------------------------------------
// Helpers for checking empty data and extracting filters
// ---------------------------------------------------------------------------

export function isEmptyData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return true;

  // rows command: empty rows array
  if (Array.isArray(data.rows) && data.rows.length === 0) return true;

  // groupby: empty buckets
  if (Array.isArray(data.buckets) && data.buckets.length === 0) return true;

  // prioritize: empty rows
  if ("total_ranked" in data && data.total_ranked === 0) return true;

  // compute: empty rows
  if ("total_scored" in data && data.total_scored === 0) return true;

  return false;
}

export function hasFilters(cmd: Record<string, unknown>): boolean {
  return Array.isArray(cmd.filters) && cmd.filters.length > 0;
}

export function getFilters(cmd: Record<string, unknown>): CohortFilter[] {
  if (!Array.isArray(cmd.filters)) return [];
  return cmd.filters as CohortFilter[];
}
