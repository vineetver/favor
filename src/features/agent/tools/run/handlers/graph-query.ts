/**
 * query command — structural pattern matching via /graph/patterns.
 *
 * Fixed response field mapping:
 *   - match.bindings → match.vars (actual API)
 *   - data.totalMatches → data.counts.returned (actual API)
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunResult, EntityRef, SeedRef } from "../types";
import { inferEdgeType } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { getCachedGraphSchema, errorResult, catchError } from "./graph";
import { okResult, TraceCollector } from "../run-result";

export interface QueryCmd {
  description?: string;
  seeds?: SeedRef[];
  pattern?: Array<{ var: string; type?: string; edge?: string; from?: string; to?: string }>;
  return_vars?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
  select?: { edgeFields?: string[]; includeEvidence?: boolean };
}

export async function handleQuery(
  cmd: QueryCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    let pattern = cmd.pattern;

    // Resolve seeds once and reuse
    let resolvedSeeds: EntityRef[] | undefined;
    if (cmd.seeds && cmd.seeds.length > 0) {
      resolvedSeeds = await resolveSeeds(cmd.seeds, resolvedCache);
    }

    // If no explicit pattern but seeds + description, build pattern from schema
    if (!pattern && resolvedSeeds && resolvedSeeds.length > 0) {
      if (resolvedSeeds.length === 0) {
        return errorResult("Could not resolve any seeds for pattern building.", tc);
      }

      const schema = await getCachedGraphSchema();
      pattern = [];

      // Create a variable for each resolved seed with type constraint and ID filter
      for (let i = 0; i < resolvedSeeds.length; i++) {
        const seed = resolvedSeeds[i];
        pattern.push({
          var: `s${i}`,
          type: seed.type,
        });
      }

      // If there are exactly 2 seeds, try to infer an edge connecting them
      if (resolvedSeeds.length === 2) {
        const edgeType = inferEdgeType(schema, resolvedSeeds[0].type, resolvedSeeds[1].type);
        if (edgeType) {
          pattern.push({
            var: "e0",
            edge: edgeType,
            from: "s0",
            to: "s1",
          });
        }
      }

      tc.add({ step: "buildPattern", kind: "decision", message: `Built pattern from ${resolvedSeeds.length} seeds` });
    }

    if (!pattern || pattern.length === 0) {
      return errorResult(
        "query requires either a 'pattern' array or 'seeds' to build a pattern from.",
        tc,
      );
    }

    // Build filters from resolved seeds (constrain var nodes to specific IDs)
    const filters: Record<string, unknown> = { ...cmd.filters };
    if (resolvedSeeds) {
      for (let i = 0; i < resolvedSeeds.length; i++) {
        filters[`s${i}.id__eq`] = resolvedSeeds[i].id;
      }
    }

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        nodeColumns?: string[];
        nodes?: Record<string, unknown[]>;
        edgeColumns?: string[];
        matches: Array<{
          vars: Record<string, string>;
          edges?: unknown[][];
          score?: number;
        }>;
        counts: {
          returned: number;
          limit?: number;
        };
      };
      meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
      fieldMeta?: unknown;
    }>("/graph/patterns", {
      method: "POST",
      body: {
        pattern,
        return: cmd.return_vars,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: Math.min(cmd.limit ?? 20, 100),
        select: cmd.select ? {
          edgeFields: cmd.select.edgeFields?.slice(0, 20),
          includeEvidence: cmd.select.includeEvidence,
        } : undefined,
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const matches = data.data?.matches ?? [];
    const total = data.data?.counts?.returned ?? matches.length;

    return okResult({
      text_summary: data.data?.textSummary ??
        `Pattern matched ${matches.length} results (${total} total)`,
      data: {
        pattern,
        matches: matches.slice(0, cmd.limit ?? 20),
        totalMatches: total,
        ...(data.data?.nodeColumns ? { nodeColumns: data.data.nodeColumns } : {}),
        ...(data.data?.nodes ? { nodes: data.data.nodes } : {}),
        ...(data.data?.edgeColumns ? { edgeColumns: data.data.edgeColumns } : {}),
        ...(data.fieldMeta ? { fieldMeta: data.fieldMeta } : {}),
      },
      state_delta: {},
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchError(err, tc);
  }
}
