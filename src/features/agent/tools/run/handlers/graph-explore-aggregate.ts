/**
 * explore mode: aggregate — edge aggregation via /graph/edges/aggregate.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreAggregate(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    if (!cmd.edge_type) {
      return errorResult("aggregate mode requires 'edge_type'.");
    }
    if (!cmd.metric) {
      return errorResult("aggregate mode requires 'metric' (count, avg, sum, min, max).");
    }

    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve seed entity.");
    }

    const seed = resolved[0];

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        seed: { type: string; id: string; label: string };
        edgeType: string;
        metric: string;
        value?: number;
        buckets?: Array<{
          key: string;
          value: number;
          count?: number;
        }>;
      };
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

    const result = data.data;
    const summary = result?.textSummary ??
      (result?.buckets
        ? `${cmd.metric} of ${cmd.edge_type} for ${seed.label}: ${result.buckets.length} groups`
        : `${cmd.metric} of ${cmd.edge_type} for ${seed.label}: ${result?.value}`);

    return {
      text_summary: summary,
      data: {
        seed,
        edgeType: cmd.edge_type,
        metric: cmd.metric,
        ...(result?.value !== undefined ? { value: result.value } : {}),
        ...(result?.buckets ? { buckets: result.buckets } : {}),
      },
      state_delta: {
        pinned_entities: [seed],
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
