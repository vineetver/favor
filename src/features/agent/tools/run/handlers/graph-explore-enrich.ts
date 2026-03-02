/**
 * explore mode: enrich — statistical over-representation test via /graph/enrichment.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import { INTENT_TO_TYPE } from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { TARGET_EDGE_MAP, errorResult, catchError } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreEnrich(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    if (!cmd.target) {
      return errorResult("enrich mode requires a 'target' intent (e.g. pathways, diseases).");
    }

    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length < 3) {
      return errorResult("Enrichment requires at least 3 resolved entities.");
    }

    const targetType = INTENT_TO_TYPE[cmd.target];
    if (!targetType) {
      return errorResult(`Unknown target intent: ${cmd.target}`);
    }

    const expectedEdge = TARGET_EDGE_MAP[targetType];
    if (!expectedEdge) {
      return errorResult(`No enrichment edge type for target: ${targetType}`);
    }

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        inputSize: number;
        backgroundSize: number;
        enriched: Array<{
          entity: EntityRef;
          overlap: number;
          pValue: number;
          adjustedPValue: number;
          foldEnrichment: number;
          overlappingEntities?: Array<{ type: string; id: string; label: string }>;
        }>;
      };
    }>("/graph/enrichment", {
      method: "POST",
      body: {
        inputSet: resolved.map((e) => ({ type: e.type, id: e.id })),
        targetType,
        edgeType: expectedEdge,
        pValueCutoff: cmd.p_cutoff ?? 0.05,
        limit: Math.min(cmd.limit ?? 20, 50),
      },
    });

    const enriched = (data.data?.enriched ?? []).slice(0, 20).map((e) => ({
      entity: e.entity,
      overlap: e.overlap,
      pValue: e.pValue,
      adjustedPValue: e.adjustedPValue,
      foldEnrichment: e.foldEnrichment,
      overlappingGenes: e.overlappingEntities?.map((oe) => oe.label) ?? [],
    }));

    if (enriched.length === 0) {
      return errorResult(`No significant enrichment found (p < ${cmd.p_cutoff ?? 0.05})`);
    }

    return {
      text_summary: data.data.textSummary ?? `${enriched.length} enriched ${cmd.target}`,
      data: {
        inputSize: data.data.inputSize,
        backgroundSize: data.data.backgroundSize,
        enriched,
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}
