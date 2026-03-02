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
import { getCachedGraphSchema, errorResult, catchError, trimEntitySubtitles, edgeTypeAnnotation } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

/** Scored entity ref — keeps rank+score so the LLM knows WHY these are the top results */
interface ScoredEntity {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
  rank?: number;
  score?: number;
}

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
    const branchResults: Record<string, {
      count: number;
      top: ScoredEntity[];
      edgeType: string;
      scoreField?: string;
      description?: string;
    }> = {};
    const allPinnedEntities: EntityRef[] = [...resolvedSeeds];

    for (const intent of cmd.into) {
      const targetType = INTENT_TO_TYPE[intent];
      if (!targetType) continue;

      const edgeTypes = findEdgesConnecting(schema, seedType, targetType);
      if (edgeTypes.length === 0) continue;

      const bestEdge = edgeTypes[0];
      // Get edge description for context
      const annotation = await edgeTypeAnnotation(bestEdge.edgeType);

      try {
        if (resolvedSeeds.length === 1) {
          const data = await agentFetch<{
            data: {
              textSummary?: string;
              neighbors: Array<{
                entity: { type: string; id: string; label: string; subtitle?: string };
                rank: number;
                score?: number;
              }>;
            };
            meta?: { resolved?: { scoreField?: string; direction?: string } };
          }>("/graph/ranked-neighbors", {
            method: "POST",
            body: {
              seed: { type: resolvedSeeds[0].type, id: resolvedSeeds[0].id },
              edgeType: bestEdge.edgeType,
              limit: Math.min(cmd.limit ?? 20, 100),
            },
          });

          const neighbors = (data.data?.neighbors ?? []).slice(0, cmd.limit ?? 20);
          trimEntitySubtitles(neighbors);
          const scoreField = data.meta?.resolved?.scoreField ?? bestEdge.defaultScoreField;

          branchResults[intent] = {
            count: neighbors.length,
            top: neighbors.map((n) => ({
              type: n.entity.type,
              id: n.entity.id,
              label: n.entity.label,
              subtitle: n.entity.subtitle,
              rank: n.rank,
              score: n.score,
            })),
            edgeType: bestEdge.edgeType,
            scoreField: scoreField ?? undefined,
            description: annotation ?? undefined,
          };
        } else {
          const nodeFields = getSummaryFields(schema, targetType).slice(0, 5);
          const edgeFields = bestEdge.defaultScoreField ? [bestEdge.defaultScoreField] : [];

          const queryResult = await agentFetch<{
            data: {
              textSummary?: string;
              nodes: Record<string, unknown>;
              edges: Array<{
                from: string;
                to: string;
                fields?: Record<string, unknown>;
              }>;
            };
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

          // Build score map from edges
          const scoreMap = new Map<string, number>();
          if (bestEdge.defaultScoreField && Array.isArray(queryResult.data?.edges)) {
            for (const edge of queryResult.data.edges) {
              const score = edge.fields?.[bestEdge.defaultScoreField];
              if (typeof score === "number") {
                const key = edge.to ?? edge.from;
                scoreMap.set(key, Math.max(scoreMap.get(key) ?? 0, score));
              }
            }
          }

          const nodeMap = queryResult.data?.nodes ?? {};
          const neighborEntities: ScoredEntity[] = [];
          for (const [key, value] of Object.entries(nodeMap)) {
            const node = value as { entity?: { type: string; id: string; label: string } };
            const entity = node.entity;
            if (!entity) continue;
            if (entity.type === targetType) {
              neighborEntities.push({
                type: entity.type,
                id: entity.id,
                label: entity.label ?? key,
                score: scoreMap.get(key),
              });
            }
          }

          // Sort by score descending if available
          if (scoreMap.size > 0) {
            neighborEntities.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          }

          branchResults[intent] = {
            count: neighborEntities.length,
            top: neighborEntities.slice(0, cmd.limit ?? 20),
            edgeType: bestEdge.edgeType,
            scoreField: bestEdge.defaultScoreField ?? undefined,
            description: annotation ?? undefined,
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

    // Supplementary: fetch protein domain positions when GENE_HAS_PROTEIN_DOMAIN detected
    let proteinDomainData: Record<string, unknown> | null = null;
    if (resolvedSeeds.length === 1) {
      const domainBranch = Object.values(branchResults).find(
        (b) => b.edgeType === "GENE_HAS_PROTEIN_DOMAIN" && b.count > 0,
      );
      if (domainBranch) {
        try {
          const edgeFields = [
            "start_residue", "end_residue", "domain_name", "domain_type",
            "mean_plddt", "alphafold_id", "protein_length", "interpro_id",
            "pfam_id", "description",
          ];
          const domainQuery = await agentFetch<{
            data: {
              nodes: Record<string, unknown>;
              edges: Array<{
                from: string;
                to: string;
                fields?: Record<string, unknown>;
              }>;
            };
          }>("/graph/query", {
            method: "POST",
            body: {
              seeds: [{ type: resolvedSeeds[0].type, id: resolvedSeeds[0].id }],
              steps: [{
                edgeTypes: ["GENE_HAS_PROTEIN_DOMAIN"],
                limit: 100,
              }],
              select: {
                nodeFields: ["label"].slice(0, 20),
                edgeFields: edgeFields.slice(0, 20),
              },
              limits: { maxNodes: 200, maxEdges: 200 },
            },
          });

          const edges = domainQuery.data?.edges ?? [];
          let proteinLength = 0;
          let alphafoldId: string | null = null;
          const domains: Array<{
            id: string;
            name: string;
            description?: string;
            start: number;
            end: number;
            type?: string;
            meanPlddt?: number;
          }> = [];

          for (const edge of edges) {
            const f = edge.fields ?? {};
            const start = f.start_residue as number | undefined;
            const end = f.end_residue as number | undefined;
            if (start == null || end == null) continue;

            if (!proteinLength && typeof f.protein_length === "number") {
              proteinLength = f.protein_length;
            }
            if (!alphafoldId && typeof f.alphafold_id === "string") {
              alphafoldId = f.alphafold_id;
            }

            domains.push({
              id: (f.interpro_id as string) ?? (f.pfam_id as string) ?? edge.to,
              name: (f.domain_name as string) ?? edge.to,
              description: f.description as string | undefined,
              start,
              end,
              type: f.domain_type as string | undefined,
              meanPlddt: f.mean_plddt as number | undefined,
            });
          }

          if (domains.length > 0) {
            // Infer protein length from max end position if not provided
            if (!proteinLength) {
              proteinLength = Math.max(...domains.map((d) => d.end));
            }
            proteinDomainData = { proteinLength, alphafoldId, domains };
          }
        } catch {
          // Non-critical — viz just won't appear
        }
      }
    }

    // Build summary with context about what was searched and how
    const parts = Object.entries(branchResults)
      .filter(([, v]) => v.count > 0)
      .map(([intent, v]) => {
        const scoreInfo = v.scoreField ? ` (ranked by ${v.scoreField})` : "";
        return `${v.count} ${intent}${scoreInfo}`;
      });
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
        ...(proteinDomainData ? { _proteinDomains: proteinDomainData } : {}),
      },
      state_delta: {
        pinned_entities: allPinnedEntities,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}
