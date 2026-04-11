/**
 * explore mode: similar — find structurally similar entities via /graph/similar.
 *
 * Fixed response field mapping:
 *   - similar[].sharedEdges → similar[].sharedNeighbors (actual API)
 *   - Added explanations[] from API response
 */

import { agentFetch } from "../../../lib/api-client";
import { resolveSeeds } from "../resolve-seeds";
import { catchToResult, okResult, TraceCollector } from "../run-result";
import type { EntityRef, RunCommand, RunResult } from "../types";
import { errorResult, trimEntitySubtitles } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreSimilar(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve seed entity.", tc);
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

    tc.add({ step: "fetchSimilar", kind: "call", message: `GET ${url}` });

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        query: { type: string; id: string; label: string };
        method?: string;
        edgeTypes?: string[];
        similar: Array<{
          entity: { type: string; id: string; label: string };
          score: number;
          sharedNeighbors: number;
          explanations?: string[];
        }>;
      };
      meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
    }>(url);

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const similar = data.data?.similar ?? [];
    trimEntitySubtitles(similar);

    const edgeContext = cmd.edge_types?.length
      ? ` based on shared ${cmd.edge_types.join(", ")} connections`
      : " based on shared graph neighborhood";
    const method = data.data?.method ?? "jaccard";

    return okResult({
      text_summary:
        data.data?.textSummary ??
        `Found ${similar.length} entities similar to ${seed.label}${edgeContext}`,
      data: {
        _mode: "similar" as const,
        _method: `Similarity is computed using ${method} method by comparing shared neighbors in the graph. Higher scores indicate more overlapping connections${cmd.edge_types?.length ? ` via ${cmd.edge_types.join(", ")}` : ""}.`,
        seed: data.data?.query ?? seed,
        method,
        similar: similar.slice(0, cmd.top_k ?? 20).map((s) => ({
          entity: s.entity,
          score: s.score,
          sharedNeighbors: s.sharedNeighbors,
          ...(s.explanations?.length ? { explanations: s.explanations } : {}),
        })),
      },
      state_delta: { pinned_entities: [seed] },
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

/** Extract entities from similar result data for pipeline forwarding. */
export function extractSimilarEntities(
  data: Record<string, unknown>,
): EntityRef[] {
  const similar = data.similar as
    | Array<{ entity?: Record<string, unknown> }>
    | undefined;
  if (!similar) return [];
  const out: EntityRef[] = [];
  for (const s of similar) {
    const ent = s.entity;
    if (ent?.type && ent.id && ent.label) {
      out.push({
        type: String(ent.type),
        id: String(ent.id),
        label: String(ent.label),
      });
    }
  }
  return out;
}
