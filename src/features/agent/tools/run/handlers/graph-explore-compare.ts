/**
 * explore mode: compare — find shared neighbors via /graph/intersect.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { findEdgesConnecting } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { getCachedGraphSchema, errorResult, catchError } from "./graph";

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

    // Auto-infer edge_type from schema if not provided
    let edgeType = cmd.edge_type;
    if (!edgeType) {
      const schema = await getCachedGraphSchema();
      const edges = findEdgesConnecting(schema, resolved[0].type, resolved[0].type);
      // Pick first edge that connects this type to anything
      if (edges.length > 0) {
        edgeType = edges[0].edgeType;
      }
    }

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
    const summary = data.data?.textSummary ??
      `Compared ${resolved.length} entities: ${shared.length} shared neighbors`;

    return {
      text_summary: summary,
      data: {
        entities: resolved,
        shared,
        unique: data.data?.unique,
        edgeType,
      },
      state_delta: {
        pinned_entities: resolved,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
