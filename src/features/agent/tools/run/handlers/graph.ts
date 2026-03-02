/**
 * Graph command handlers: explore, traverse, paths, compare, enrich
 */

import { agentFetch, AgentToolError } from "../../../lib/api-client";
import type { RunCommand, RunResult, EntityRef } from "../types";
import {
  INTENT_TO_TYPE,
  findEdgesConnecting,
  getSummaryFields,
  type GraphSchemaResponse,
} from "../intent-aliases";
import { resolveSeeds } from "../resolve-seeds";
import type { TargetIntent } from "../types";

// Cache graph schema per portal
const schemaCache = new Map<string, { schema: GraphSchemaResponse; ts: number }>();
const SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 min

async function getCachedGraphSchema(portal?: string): Promise<GraphSchemaResponse> {
  const key = portal ?? "default";
  const cached = schemaCache.get(key);
  if (cached && Date.now() - cached.ts < SCHEMA_CACHE_TTL) return cached.schema;

  // GET /graph/schema wraps the payload in { data: { nodeTypes, edgeTypes } }
  const resp = await agentFetch<{ data: GraphSchemaResponse }>("/graph/schema");
  const schema = resp.data;
  schemaCache.set(key, { schema, ts: Date.now() });
  return schema;
}

// ---------------------------------------------------------------------------
// Enrichment edge type mapping
// ---------------------------------------------------------------------------

const TARGET_EDGE_MAP: Record<string, string> = {
  Pathway: "GENE_PARTICIPATES_IN_PATHWAY",
  Disease: "GENE_ASSOCIATED_WITH_DISEASE",
  GOTerm: "GENE_ANNOTATED_WITH_GO_TERM",
  Phenotype: "GENE_ASSOCIATED_WITH_PHENOTYPE",
};

// ---------------------------------------------------------------------------
// explore
// ---------------------------------------------------------------------------

export async function handleExplore(
  cmd: Extract<RunCommand, { command: "explore" }>,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    // 1. Resolve seeds
    const resolvedSeeds = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolvedSeeds.length === 0) {
      return errorResult("Could not resolve any seeds. Check entity names.");
    }

    // 2. Get graph schema
    const schema = await getCachedGraphSchema();

    // 3. For each target intent, find best edge types
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
        // Use ranked-neighbors for single-seed, graph/query for multi-seed
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
          // Multi-seed: use graph/query with branch
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

          // Extract neighbor entities from query result
          // /graph/query returns nodes as { "Type:ID": { entity: { type, id, label }, fields? } }
          const nodeMap = queryResult.data?.nodes ?? {};
          const neighborEntities: EntityRef[] = [];
          for (const [key, value] of Object.entries(nodeMap)) {
            const node = value as { entity?: { type: string; id: string; label: string }; fields?: Record<string, unknown> };
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

    // 4. Optionally run enrichment for pathways with 3+ seeds
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

    // 5. Build summary
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

// ---------------------------------------------------------------------------
// traverse
// ---------------------------------------------------------------------------

export async function handleTraverse(
  cmd: Extract<RunCommand, { command: "traverse" }>,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
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

        // Use last step's results as seeds if available, otherwise original seed
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
        // Enrichment step — use current frontier as input
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
        seed: seed,
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

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------

export async function handlePaths(
  cmd: Extract<RunCommand, { command: "paths" }>,
): Promise<RunResult> {
  try {
    const params = new URLSearchParams();
    params.set("from", cmd.from);
    params.set("to", cmd.to);
    params.set("maxHops", String(Math.min(cmd.max_hops ?? 3, 5)));
    params.set("limit", String(Math.min(cmd.limit ?? 5, 50)));

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        from: string;
        to: string;
        nodeColumns: string[];
        nodes: Record<string, unknown[]>;
        paths: Array<{
          text: string;
          nodes: string[];
          edges: unknown[][];
          score: number;
        }>;
      };
    }>(`/graph/paths?${params.toString()}`);

    const { nodeColumns, nodes: nodesMap } = data.data;
    const typeIdx = nodeColumns.indexOf("type");
    const idIdx = nodeColumns.indexOf("id");
    const labelIdx = nodeColumns.indexOf("label");

    const paths = (data.data.paths ?? []).slice(0, cmd.limit ?? 5).map((p, idx) => ({
      rank: idx + 1,
      length: p.nodes.length - 1,
      pathText: p.text,
      nodes: p.nodes.map((nodeKey) => {
        const row = nodesMap[nodeKey];
        if (!row) {
          const colonIdx = nodeKey.indexOf(":");
          return {
            type: colonIdx > 0 ? nodeKey.slice(0, colonIdx) : "Unknown",
            id: colonIdx > 0 ? nodeKey.slice(colonIdx + 1) : nodeKey,
            label: nodeKey,
          };
        }
        return {
          type: (row[typeIdx] as string) ?? "Unknown",
          id: (row[idIdx] as string) ?? nodeKey,
          label: (row[labelIdx] as string) ?? nodeKey,
        };
      }),
    }));

    if (paths.length === 0) {
      return errorResult(`No paths found between ${cmd.from} and ${cmd.to}`);
    }

    return {
      text_summary: data.data.textSummary ?? `${paths.length} paths found`,
      data: { from: data.data.from, to: data.data.to, paths },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}

// ---------------------------------------------------------------------------
// compare
// ---------------------------------------------------------------------------

export async function handleCompare(
  cmd: Extract<RunCommand, { command: "compare" }>,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    const resolved = await resolveSeeds(cmd.entities, resolvedCache);
    if (resolved.length < 2) {
      return errorResult("Need at least 2 resolved entities to compare.");
    }

    const data = await agentFetch<{
      data: Record<string, unknown>;
    }>("/graph/compare", {
      method: "POST",
      body: { entities: resolved.map((e) => ({ type: e.type, id: e.id })) },
    });

    return {
      text_summary: (data.data.textSummary as string) ?? `Compared ${resolved.length} entities`,
      data: data.data,
      state_delta: {
        pinned_entities: resolved,
      },
    };
  } catch (err) {
    return catchError(err);
  }
}

// ---------------------------------------------------------------------------
// enrich
// ---------------------------------------------------------------------------

export async function handleEnrich(
  cmd: Extract<RunCommand, { command: "enrich" }>,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  try {
    const resolved = await resolveSeeds(cmd.input_set, resolvedCache);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResult(message: string): RunResult {
  return {
    text_summary: message,
    data: { error: true, message },
    state_delta: {},
  };
}

function catchError(err: unknown): RunResult {
  if (err instanceof AgentToolError) {
    return {
      text_summary: err.detail,
      data: err.toToolResult(),
      state_delta: {},
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    text_summary: `Internal error: ${message}`,
    data: { error: true, message },
    state_delta: {},
  };
}
