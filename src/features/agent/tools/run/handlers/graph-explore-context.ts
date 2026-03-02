/**
 * explore mode: context — rich entity context via /graph/context.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { resolveSeeds } from "../resolve-seeds";
import { errorResult, catchError } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreContext(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve any seed entities.");
    }

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        entities: Array<{
          entity: { type: string; id: string; label: string };
          summary?: string;
          neighbors?: Record<string, number>;
          evidence?: Array<{ source: string; text: string; score?: number }>;
          ontology?: Array<{ term: string; id: string; relation: string }>;
        }>;
      };
    }>("/graph/context", {
      method: "POST",
      body: {
        entities: resolved.map((e) => ({ type: e.type, id: e.id })),
        sections: cmd.sections ?? ["summary", "neighbors"],
        depth: cmd.context_depth ?? "standard",
      },
    });

    const entities = data.data?.entities ?? [];
    const names = resolved.map((e) => e.label).join(", ");

    return {
      text_summary: data.data?.textSummary ??
        `Context for ${names}: ${entities.length} entity profiles`,
      data: { entities },
      state_delta: {
        pinned_entities: resolved,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
