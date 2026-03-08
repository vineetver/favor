/**
 * explore mode: neighbors — find related entities from seeds via ranked-neighbors or graph/query.
 *
 * M9: Added expandDescendants support for disease queries.
 * Phase 5: TraceCollector for observability.
 * Phase 6: Budget-bounded intent processing.
 */

import { agentFetch } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import type { TargetIntent } from "../types";
import {
  resolveIntentType,
  findEdgesConnecting,
  canonicalizeIntent,
  type EdgeTypeInfo,
  type GraphSchemaResponse,
} from "../intent-aliases";
import { resolveSeeds, warnPartialResolution } from "../resolve-seeds";
import {
  getCachedGraphSchema,
  errorResult,
  trimEntitySubtitles,
  edgeTypeAnnotation,
  humanEdgeLabel,
  pickSortField,
  applyDefaultKeyFilters,
  schemaGuidedRecovery,
} from "./graph";
import { okResult, catchToResult, TraceCollector } from "../run-result";

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

/** Max intents to process per call to bound fan-out */
const MAX_INTENTS_PER_CALL = 5;

/** Max edge candidates to try per intent before giving up */
const MAX_CASCADE = 3;

interface AvailableRelationship {
  edgeType: string;
  label: string;
  used: boolean;
}

/** Fetch neighbors for a specific edge type. Handles single-seed (ranked-neighbors)
 *  and multi-seed (graph/query). Returns raw count + entities — caller adds annotations. */
async function fetchForEdge(
  seeds: EntityRef[],
  edge: EdgeTypeInfo,
  targetType: string,
  limit: number,
  opts: {
    isDiseaseQuery: boolean;
    schema: GraphSchemaResponse;
    filters?: Record<string, unknown>;
    tc: TraceCollector;
  },
): Promise<{ count: number; top: ScoredEntity[]; scoreField?: string }> {
  const { isDiseaseQuery, schema, filters, tc } = opts;

  if (seeds.length === 1) {
    tc.add({ step: `edge_${edge.edgeType}`, kind: "call", message: `ranked-neighbors: ${edge.edgeType}` });

    const data = await agentFetch<{
      data: {
        neighbors: Array<{
          entity: { type: string; id: string; label: string; subtitle?: string };
          rank: number;
          score?: number;
        }>;
      };
      meta?: { resolved?: { scoreField?: string; sort?: string; direction?: string }; warnings?: unknown[] };
    }>("/graph/ranked-neighbors", {
      method: "POST",
      body: {
        seed: { type: seeds[0].type, id: seeds[0].id },
        edgeType: edge.edgeType,
        limit: Math.min(limit, 100),
        ...(isDiseaseQuery ? { expandDescendants: true, expandLimit: 500 } : {}),
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const neighbors = (data.data?.neighbors ?? []).slice(0, limit);
    trimEntitySubtitles(neighbors);

    return {
      count: neighbors.length,
      top: neighbors.map((n) => ({
        type: n.entity.type,
        id: n.entity.id,
        label: n.entity.label,
        subtitle: n.entity.subtitle,
        rank: n.rank,
        score: n.score,
      })),
      scoreField: data.meta?.resolved?.scoreField ?? data.meta?.resolved?.sort ?? edge.defaultScoreField ?? undefined,
    };
  }

  // Multi-seed → graph/query
  tc.add({ step: `edge_${edge.edgeType}`, kind: "call", message: `graph/query multi-seed: ${edge.edgeType}` });

  const sortField = pickSortField(schema, edge.edgeType);
  const { filters: mergedFilters, applied: appliedDefaults } = applyDefaultKeyFilters(
    schema, edge.edgeType, filters,
  );
  if (appliedDefaults.length > 0) {
    tc.add({ step: `edge_${edge.edgeType}`, kind: "decision", message: `Default filters: ${appliedDefaults.join(", ")}` });
  }

  const queryResult = await agentFetch<{
    data: {
      nodes: Record<string, unknown>;
      edges: Array<{ from: string; to: string; fields?: Record<string, unknown> }>;
    };
    meta: { warnings?: unknown[] };
  }>("/graph/query", {
    method: "POST",
    body: {
      seeds: seeds.map((s) => ({ type: s.type, id: s.id })),
      steps: [{
        edgeTypes: [edge.edgeType],
        limit: Math.min(limit, 100),
        sort: sortField,
        ...(Object.keys(mergedFilters).length > 0 ? { filters: mergedFilters } : {}),
      }],
      limits: { maxNodes: 500, maxEdges: 2000 },
      mode: "compact",
    },
  });

  tc.mergeApiWarnings(queryResult.meta?.warnings);

  const scoreMap = new Map<string, number>();
  if (edge.defaultScoreField && Array.isArray(queryResult.data?.edges)) {
    for (const e of queryResult.data.edges) {
      const score = e.fields?.[edge.defaultScoreField];
      if (typeof score === "number") {
        const key = e.to ?? e.from;
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

  if (scoreMap.size > 0) {
    neighborEntities.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  return {
    count: neighborEntities.length,
    top: neighborEntities.slice(0, limit),
    scoreField: edge.defaultScoreField ?? undefined,
  };
}

export async function handleExploreNeighbors(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    if (!cmd.into || cmd.into.length === 0) {
      return errorResult("neighbors mode requires at least one target intent in 'into'.", tc);
    }

    const resolvedSeeds = await resolveSeeds(cmd.seeds, resolvedCache);
    warnPartialResolution(cmd.seeds.length, resolvedSeeds.length, tc);
    if (resolvedSeeds.length === 0) {
      return errorResult("Could not resolve any seeds. Check entity names or use exact {type, id}.", tc);
    }

    const schema = await getCachedGraphSchema();
    const seedType = resolvedSeeds[0].type;

    // Phase 6: Bound intents
    const intents = cmd.into.slice(0, MAX_INTENTS_PER_CALL);
    if (cmd.into.length > MAX_INTENTS_PER_CALL) {
      tc.warn("intents_capped", `Processing ${MAX_INTENTS_PER_CALL} of ${cmd.into.length} intents`);
    }

    // M9: Auto-enable expandDescendants for disease seeds
    const isDiseaseQuery = seedType === "Disease";
    if (isDiseaseQuery) {
      tc.add({ step: "diseaseExpansion", kind: "decision", message: "Disease seed detected — expandDescendants available" });
    }

    const branchResults: Record<string, {
      count: number;
      top: ScoredEntity[];
      edgeType: string;
      scoreField?: string;
      description?: string;
      availableRelationships?: AvailableRelationship[];
    }> = {};
    const allPinnedEntities: EntityRef[] = [...resolvedSeeds];
    let apiCalls = 0;

    for (const rawIntent of intents) {
      const [intent, repairNote] = canonicalizeIntent(rawIntent);
      if (repairNote) tc.warn("intent_repair", repairNote);

      const targetType = resolveIntentType(intent);
      if (!targetType) continue;

      const edgeCandidates = findEdgesConnecting(schema, seedType, targetType, intent);
      if (edgeCandidates.length === 0) {
        tc.add({ step: `intent_${intent}`, kind: "decision", message: `No edge ${seedType}→${targetType}` });
        continue;
      }

      // Edge cascade: try candidates in preference order, stop at first with results.
      // General pattern — works for any seed→target pair with multiple edge types.
      let hit: { count: number; top: ScoredEntity[]; edgeType: string; scoreField?: string; description?: string } | null = null;

      for (const edge of edgeCandidates.slice(0, MAX_CASCADE)) {
        try {
          const result = await fetchForEdge(resolvedSeeds, edge, targetType, cmd.limit ?? 20, {
            isDiseaseQuery,
            schema,
            filters: cmd.filters as Record<string, unknown> | undefined,
            tc,
          });
          apiCalls++;

          if (result.count > 0) {
            const annotation = await edgeTypeAnnotation(edge.edgeType);
            hit = { ...result, edgeType: edge.edgeType, description: annotation ?? undefined };
            break;
          }

          // Log cascade only when there are more candidates to try
          if (edgeCandidates.indexOf(edge) < edgeCandidates.length - 1) {
            tc.add({ step: `intent_${intent}`, kind: "fallback", message: `0 via ${humanEdgeLabel(edge.edgeType)}, trying next` });
          }
        } catch (err) {
          const recovered = schemaGuidedRecovery(err, schema, tc);
          if (recovered) return recovered;
          const msg = err instanceof Error ? err.message : String(err);
          tc.warn("edge_failed", `${intent}/${edge.edgeType}: ${msg}`);
        }
      }

      branchResults[intent] = hit ?? { count: 0, top: [], edgeType: edgeCandidates[0].edgeType };

      // Annotate available relationships — zero extra API calls, just reads from candidates
      if (edgeCandidates.length > 1) {
        branchResults[intent].availableRelationships = edgeCandidates.map((e) => ({
          edgeType: e.edgeType,
          label: humanEdgeLabel(e.edgeType),
          used: e.edgeType === branchResults[intent].edgeType,
        }));
      }
    }

    // Optionally run enrichment for pathways with 3+ seeds
    let enrichmentResult: Record<string, unknown> | null = null;
    if (intents.includes("pathways" as TargetIntent) && resolvedSeeds.length >= 3) {
      try {
        tc.add({ step: "autoEnrich", kind: "call", message: "Auto-enrichment for pathways (3+ seeds)" });
        apiCalls++;

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
          meta?: { warnings?: unknown[] };
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
        tc.mergeApiWarnings(enrichData.meta?.warnings);
        enrichmentResult = { enriched: enrichData.data?.enriched ?? [] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tc.warn("enrichment_failed", `Auto-enrichment failed: ${msg}`);
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
          tc.add({ step: "proteinDomains", kind: "call", message: "Fetching protein domain positions" });
          apiCalls++;

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
              limits: { maxNodes: 200, maxEdges: 200 },
              mode: "compact",
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
            if (!proteinLength) {
              proteinLength = Math.max(...domains.map((d) => d.end));
            }
            proteinDomainData = { proteinLength, alphafoldId, domains };
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          tc.warn("protein_domains_failed", `Protein domain fetch failed: ${msg}`);
        }
      }
    }

    // Build summary with context about what was searched and how
    const parts = Object.entries(branchResults)
      .filter(([, v]) => v.count > 0)
      .map(([intent, v]) => {
        const scoreInfo = v.scoreField ? ` (ranked by ${v.scoreField})` : "";
        const unused = v.availableRelationships?.filter((r) => !r.used);
        const alsoInfo = unused?.length ? ` [also: ${unused.map((r) => r.label).join(", ")}]` : "";
        return `${v.count} ${intent}${scoreInfo}${alsoInfo}`;
      });
    const seedNames = resolvedSeeds.map((s) => s.label).join(", ");
    const summary = parts.length > 0
      ? `Explored ${seedNames} → found ${parts.join(", ")}`
      : `Explored ${seedNames} → no results for ${intents.join(", ")}`;

    // Determine if partial (some intents failed)
    const failedIntents = Object.entries(branchResults).filter(([, v]) => v.count === 0);
    const hasPartialFailure = failedIntents.length > 0 && parts.length > 0;

    const result = okResult({
      text_summary: summary,
      data: {
        _mode: "neighbors" as const,
        results: branchResults,
        resolved_seeds: resolvedSeeds,
        ...(enrichmentResult ? { enrichment: enrichmentResult } : {}),
        ...(proteinDomainData ? { _proteinDomains: proteinDomainData } : {}),
      },
      state_delta: { pinned_entities: allPinnedEntities },
      tc,
      budgets_remaining: { api_calls: Math.max(0, 15 - apiCalls) },
    });

    if (hasPartialFailure) {
      result.status = "partial";
    }

    return result;
  } catch (err) {
    return catchToResult(err, tc);
  }
}

/** Extract entities from neighbors result data for pipeline forwarding. */
export function extractNeighborEntities(data: Record<string, unknown>): EntityRef[] {
  const results = data.results as Record<string, { top?: unknown[] }> | undefined;
  if (!results) return [];
  const out: EntityRef[] = [];
  for (const branch of Object.values(results)) {
    for (const e of branch.top ?? []) {
      const ent = e as Record<string, unknown>;
      if (ent.type && ent.id && ent.label) {
        out.push({ type: String(ent.type), id: String(ent.id), label: String(ent.label) });
      }
    }
  }
  return out;
}
