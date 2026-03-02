/**
 * explore mode: compare — find shared neighbors via /graph/intersect.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError, trimEntitySubtitles, edgeTypeAnnotation } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreCompare(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length < 2) {
      return errorResult("compare mode requires at least 2 resolved entities.");
    }

    // Auto-infer edge_type from schema if not provided.
    // The intersect API can auto-infer too, so passing undefined is fine.
    const edgeType = cmd.edge_type;

    // Get edge description for context
    const annotation = edgeType ? await edgeTypeAnnotation(edgeType) : null;

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        shared: Array<{
          entity: { type: string; id: string; label: string };
          sharedBy: string[];
          score?: number;
        }>;
        unique?: Record<string, Array<{
          entity: { type: string; id: string; label: string };
        }>>;
      };
    }>("/graph/intersect", {
      method: "POST",
      body: {
        entities: resolved.map((e) => ({ type: e.type, id: e.id })),
        edgeType,
        direction: cmd.direction,
        limit: Math.min(cmd.limit ?? 20, 100),
      },
    });

    const shared = data.data?.shared ?? [];
    trimEntitySubtitles(shared);

    const entityNames = resolved.map((e) => e.label).join(" vs ");
    const summary = data.data?.textSummary ??
      `Compared ${entityNames} via ${edgeType}: ${shared.length} shared neighbors`;

    return {
      text_summary: summary,
      data: {
        entities: resolved,
        edgeType,
        edgeDescription: annotation ?? undefined,
        shared,
        unique: data.data?.unique,
      },
      state_delta: {
        pinned_entities: resolved,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
