/**
 * explore mode: neighbors — find related entities from seeds via ranked-neighbors or graph/query.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import type { TargetIntent } from "../types";
import {
  INTENT_TO_TYPE,
  findEdgesConnecting,
  getSummaryFields,
} from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import { getCachedGraphSchema, errorResult, catchError } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

export async function handleExploreNeighbors(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    if (!cmd.into || cmd.into.length === 0) {
      return errorResult("neighbors mode requires at least one target intent in 'into'.");
    }

    const resolvedSeeds = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolvedSeeds.length === 0) {
      return errorResult("Could not resolve any seeds. Check entity names.");
    }

    const schema = await getCachedGraphSchema();
    const seedType = resolvedSeeds[0].type;
    const branchResults: Record<string, { count: number; top: EntityRef[]; edgeType: string }> = {};
    const allPinnedEntities: EntityRef[] = [...resolvedSeeds];

    for (const intent of cmd.into) {
      const targetType = INTENT_TO_TYPE[intent];
      if (!targetType) continue;

      const edgeTypes = findEdgesConnecting(schema, seedType, targetType);
      if (edgeTypes.length === 0) continue;

      const bestEdge = edgeTypes[0];

      try {
        if (resolvedSeeds.length === 1) {
          const data = await agentFetch<{
            data: {
              neighbors: Array<{
                entity: { type: string; id: string; label: string };
                rank: number;
                score?: number;
              }>;
            };
          }>("/graph/ranked-neighbors", {
            method: "POST",
            body: {
              seed: { type: resolvedSeeds[0].type, id: resolvedSeeds[0].id },
              edgeType: bestEdge.edgeType,
              limit: Math.min(cmd.limit ?? 20, 100),
            },
          });

          const neighbors = (data.data?.neighbors ?? []).slice(0, cmd.limit ?? 20);
          branchResults[intent] = {
            count: neighbors.length,
            top: neighbors.map((n) => n.entity),
            edgeType: bestEdge.edgeType,
          };
        } else {
          const nodeFields = getSummaryFields(schema, targetType).slice(0, 5);
          const edgeFields = bestEdge.defaultScoreField ? [bestEdge.defaultScoreField] : [];

          const queryResult = await agentFetch<{
            data: { nodes: Record<string, unknown>; edges: unknown };
            meta: { nodeCount: number; edgeCount: number };
          }>("/graph/query", {
            method: "POST",
            body: {
              seeds: resolvedSeeds.map((s) => ({ type: s.type, id: s.id })),
              steps: [{
                edgeTypes: [bestEdge.edgeType],
                limit: Math.min(cmd.limit ?? 20, 100),
                sort: bestEdge.defaultScoreField ? `-${bestEdge.defaultScoreField}` : undefined,
              }],
              select: {
                nodeFields: nodeFields.slice(0, 20),
                edgeFields: edgeFields.slice(0, 20),
              },
              limits: { maxNodes: 500, maxEdges: 2000 },
            },
          });

          const nodeMap = queryResult.data?.nodes ?? {};
          const neighborEntities: EntityRef[] = [];
          for (const [key, value] of Object.entries(nodeMap)) {
            const node = value as { entity?: { type: string; id: string; label: string } };
            const entity = node.entity;
            if (!entity) continue;
            if (entity.type === targetType) {
              neighborEntities.push({
                type: entity.type,
                id: entity.id,
                label: entity.label ?? key,
              });
            }
          }

          branchResults[intent] = {
            count: neighborEntities.length,
            top: neighborEntities.slice(0, cmd.limit ?? 20),
            edgeType: bestEdge.edgeType,
          };
        }
      } catch {
        branchResults[intent] = { count: 0, top: [], edgeType: bestEdge.edgeType };
      }
    }

    // Optionally run enrichment for pathways with 3+ seeds
    let enrichmentResult: Record<string, unknown> | null = null;
    if (cmd.into.includes("pathways" as TargetIntent) && resolvedSeeds.length >= 3) {
      try {
        const enrichData = await agentFetch<{
          data: {
            enriched: Array<{
              entity: { type: string; id: string; label: string };
              overlap: number;
              pValue: number;
              adjustedPValue: number;
              foldEnrichment: number;
            }>;
          };
        }>("/graph/enrichment", {
          method: "POST",
          body: {
            inputSet: resolvedSeeds.map((s) => ({ type: s.type, id: s.id })),
            targetType: "Pathway",
            edgeType: "GENE_PARTICIPATES_IN_PATHWAY",
            pValueCutoff: 0.05,
            limit: 20,
          },
        });
        enrichmentResult = { enriched: enrichData.data?.enriched ?? [] };
      } catch {
        // Non-critical
      }
    }

    const parts = Object.entries(branchResults)
      .filter(([, v]) => v.count > 0)
      .map(([intent, v]) => `${v.count} ${intent}`);
    const seedNames = resolvedSeeds.map((s) => s.label).join(", ");
    const summary = parts.length > 0
      ? `Explored ${seedNames} → found ${parts.join(", ")}`
      : `Explored ${seedNames} → no results for ${cmd.into.join(", ")}`;

    return {
      text_summary: summary,
      data: {
        results: branchResults,
        resolved_seeds: resolvedSeeds,
        ...(enrichmentResult ? { enrichment: enrichmentResult } : {}),
      },
      state_delta: {
        pinned_entities: allPinnedEntities,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
