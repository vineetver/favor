/**
 * explore mode: similar — find structurally similar entities via /graph/similar.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError, trimEntitySubtitles } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreSimilar(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve seed entity.");
    }

    const seed = resolved[0];
    const params = new URLSearchParams();
    if (cmd.edge_types && cmd.edge_types.length > 0) {
      params.set("edgeTypes", cmd.edge_types.join(","));
    }
    if (cmd.top_k) {
      params.set("topK", String(Math.min(cmd.top_k, 100)));
    }

    const qs = params.toString();
    const url = `/graph/similar/${encodeURIComponent(seed.type)}/${encodeURIComponent(seed.id)}${qs ? `?${qs}` : ""}`;

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        seed: { type: string; id: string; label: string };
        similar: Array<{
          entity: { type: string; id: string; label: string };
          score: number;
          sharedEdges?: number;
        }>;
      };
    }>(url);

    const similar = data.data?.similar ?? [];
    trimEntitySubtitles(similar);

    const edgeContext = cmd.edge_types?.length
      ? ` based on shared ${cmd.edge_types.join(", ")} connections`
      : " based on shared graph neighborhood";

    return {
      text_summary: data.data?.textSummary ??
        `Found ${similar.length} entities similar to ${seed.label}${edgeContext}`,
      data: {
        _method: `Similarity is computed by comparing shared neighbors in the graph. Higher scores indicate more overlapping connections${cmd.edge_types?.length ? ` via ${cmd.edge_types.join(", ")}` : ""}.`,
        seed,
        similar: similar.slice(0, cmd.top_k ?? 20),
      },
      state_delta: {
        pinned_entities: [seed],
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
