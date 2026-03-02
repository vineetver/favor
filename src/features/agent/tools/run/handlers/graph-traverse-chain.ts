/**
 * traverse mode: chain — multi-hop traversal with intent-first steps.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import {
  INTENT_TO_TYPE,
  findEdgesConnecting,
} from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { getCachedGraphSchema, TARGET_EDGE_MAP, errorResult, catchError } from "./graph";

type TraverseCmd = Extract<RunCommand, { command: "traverse" }>;

export async function handleTraverseChain(
  cmd: TraverseCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    if (!cmd.seed) {
      return errorResult("chain mode requires a 'seed' entity.");
    }
    if (!cmd.steps || cmd.steps.length === 0) {
      return errorResult("chain mode requires at least one step.");
    }

    const resolvedSeeds = await resolveSeeds([cmd.seed], resolvedCache);
    if (resolvedSeeds.length === 0) {
      return errorResult("Could not resolve seed entity.");
    }

    const seed = resolvedSeeds[0];
    const schema = await getCachedGraphSchema();
    let currentType = seed.type;
    const allResults: Array<{ step: number; intent: string; entities: EntityRef[] }> = [];

    for (let i = 0; i < cmd.steps.length; i++) {
      const step = cmd.steps[i];

      if ("into" in step) {
        const targetType = INTENT_TO_TYPE[step.into];
        if (!targetType) continue;

        const edgeTypes = findEdgesConnecting(schema, currentType, targetType);
        if (edgeTypes.length === 0) {
          allResults.push({ step: i, intent: step.into, entities: [] });
          continue;
        }

        const seeds = i > 0 && allResults[i - 1]?.entities.length
          ? allResults[i - 1].entities.slice(0, 10)
          : [seed];

        const data = await agentFetch<{
          data: { neighbors: Array<{ entity: EntityRef; rank: number; score?: number }> };
        }>("/graph/ranked-neighbors", {
          method: "POST",
          body: {
            seed: { type: seeds[0].type, id: seeds[0].id },
            edgeType: edgeTypes[0].edgeType,
            limit: Math.min(step.top ?? 20, 100),
          },
        });

        const entities = (data.data?.neighbors ?? []).map((n) => n.entity);
        allResults.push({ step: i, intent: step.into, entities });
        currentType = targetType;
      } else if ("enrich" in step) {
        const targetType = INTENT_TO_TYPE[step.enrich];
        if (!targetType) continue;

        const inputSet = i > 0 && allResults[i - 1]?.entities.length
          ? allResults[i - 1].entities.slice(0, 50)
          : [seed];

        if (inputSet.length < 3) {
          allResults.push({ step: i, intent: step.enrich, entities: [] });
          continue;
        }

        const expectedEdge = TARGET_EDGE_MAP[targetType];
        if (!expectedEdge) continue;

        const data = await agentFetch<{
          data: {
            enriched: Array<{
              entity: EntityRef;
              overlap: number;
              pValue: number;
              adjustedPValue: number;
              foldEnrichment: number;
            }>;
          };
        }>("/graph/enrichment", {
          method: "POST",
          body: {
            inputSet: inputSet.map((e) => ({ type: e.type, id: e.id })),
            targetType,
            edgeType: expectedEdge,
            pValueCutoff: step.p_cutoff ?? 0.05,
            limit: step.top ?? 20,
          },
        });

        const entities = (data.data?.enriched ?? []).map((e) => e.entity);
        allResults.push({ step: i, intent: step.enrich, entities });
      }
    }

    const summary = allResults
      .map((r) => `Step ${r.step + 1} (${r.intent}): ${r.entities.length} results`)
      .join("; ");

    return {
      text_summary: `Traversal from ${seed.label}: ${summary}`,
      data: {
        seed,
        steps: allResults.map((r) => ({
          intent: r.intent,
          count: r.entities.length,
          top: r.entities.slice(0, 10),
        })),
      },
      state_delta: {
        pinned_entities: [seed],
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
