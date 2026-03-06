/**
 * explore mode: aggregate — edge aggregation via /graph/edges/aggregate.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError, edgeTypeAnnotation, humanEdgeLabel } from "./graph";
import { okResult, TraceCollector } from "../run-result";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreAggregate(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.edge_type) {
      return errorResult("aggregate mode requires 'edge_type'.", tc);
    }
    if (!cmd.metric) {
      return errorResult("aggregate mode requires 'metric' (count, avg, sum, min, max).", tc);
    }

    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve seed entity.", tc);
    }

    const seed = resolved[0];
    const annotation = await edgeTypeAnnotation(cmd.edge_type);

    tc.add({ step: "fetchAggregate", kind: "call", message: `POST /graph/edges/aggregate` });

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        seed: { type: string; id: string; label: string };
        edgeType: string;
        totalEdges?: number;
        metric: string;
        value?: number;
        buckets?: Array<{
          key: string;
          value: number;
          count?: number;
        }>;
      };
      meta?: { requestId?: string; resolved?: { scoreField?: string; direction?: string }; warnings?: unknown[] };
    }>("/graph/edges/aggregate", {
      method: "POST",
      body: {
        seed: { type: seed.type, id: seed.id },
        edgeType: cmd.edge_type,
        direction: cmd.direction,
        filters: cmd.filters,
        groupBy: cmd.group_by,
        metric: cmd.metric,
        scoreField: cmd.score_field,
        limit: Math.min(cmd.limit ?? 20, 100),
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const result = data.data;
    const resolvedScoreField = data.meta?.resolved?.scoreField ?? cmd.score_field;
    const edgeLabel = humanEdgeLabel(cmd.edge_type);
    const summary = result?.textSummary ??
      (result?.buckets
        ? `${cmd.metric} of ${edgeLabel} for ${seed.label}: ${result.buckets.length} groups`
        : `${cmd.metric} of ${edgeLabel} for ${seed.label}: ${result?.value}`);

    return okResult({
      text_summary: summary,
      data: {
        seed,
        relationship: edgeLabel,
        edgeDescription: annotation ?? undefined,
        metric: cmd.metric,
        scoreField: resolvedScoreField ?? undefined,
        ...(result?.totalEdges != null ? { totalEdges: result.totalEdges } : {}),
        ...(cmd.group_by ? { groupBy: cmd.group_by } : {}),
        ...(result?.value !== undefined ? { value: result.value } : {}),
        ...(result?.buckets ? { buckets: result.buckets } : {}),
      },
      state_delta: { pinned_entities: [seed] },
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchError(err, tc);
  }
}
