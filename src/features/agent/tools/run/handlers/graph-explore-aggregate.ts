/**
 * explore mode: aggregate — edge aggregation via /graph/edges/aggregate.
 */

import { agentFetch } from "../../../lib/api-client";
import { findEdgesConnecting, resolveIntentType } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { catchToResult, okResult, TraceCollector } from "../run-result";
import type { EntityRef, RunCommand, RunResult } from "../types";
import {
  edgeTypeAnnotation,
  errorResult,
  getCachedGraphSchema,
  humanEdgeLabel,
} from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreAggregate(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.metric) {
      return errorResult(
        "aggregate mode requires 'metric' (count, avg, sum, min, max).",
        tc,
      );
    }

    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve seed entity.", tc);
    }

    const seed = resolved[0];

    // Resolve edge_type: explicit > into fallback > error
    let edgeType = cmd.edge_type;
    if (!edgeType && cmd.into?.length) {
      const targetType = resolveIntentType(cmd.into[0]);
      if (targetType) {
        const schema = await getCachedGraphSchema();
        const edges = findEdgesConnecting(
          schema,
          seed.type,
          targetType,
          cmd.into[0],
        );
        edgeType = edges[0]?.edgeType;
      }
    }
    if (!edgeType) {
      return errorResult(
        "aggregate mode requires 'edge_type' or 'into' to resolve one.",
        tc,
      );
    }

    const annotation = await edgeTypeAnnotation(edgeType);

    tc.add({
      step: "fetchAggregate",
      kind: "call",
      message: `POST /graph/edges/aggregate`,
    });

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
      meta?: {
        requestId?: string;
        resolved?: { scoreField?: string; direction?: string };
        warnings?: unknown[];
      };
    }>("/graph/edges/aggregate", {
      method: "POST",
      body: {
        seed: { type: seed.type, id: seed.id },
        edgeType,
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
    const resolvedScoreField =
      data.meta?.resolved?.scoreField ?? cmd.score_field;
    const edgeLabel = humanEdgeLabel(edgeType);
    const summary =
      result?.textSummary ??
      (result?.buckets
        ? `${cmd.metric} of ${edgeLabel} for ${seed.label}: ${result.buckets.length} groups`
        : `${cmd.metric} of ${edgeLabel} for ${seed.label}: ${result?.value}`);

    return okResult({
      text_summary: summary,
      data: {
        _mode: "aggregate" as const,
        seed,
        relationship: edgeLabel,
        edgeDescription: annotation ?? undefined,
        metric: cmd.metric,
        scoreField: resolvedScoreField ?? undefined,
        ...(result?.totalEdges != null
          ? { totalEdges: result.totalEdges }
          : {}),
        ...(cmd.group_by ? { groupBy: cmd.group_by } : {}),
        ...(result?.value !== undefined ? { value: result.value } : {}),
        ...(result?.buckets ? { buckets: result.buckets } : {}),
      },
      state_delta: { pinned_entities: [seed] },
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}
