import type { Gene } from "../types";
import { fetchOrNull } from "@infra/api";

// Re-export all graph API functions for backward compatibility
export {
  fetchSubgraph,
  fetchGraphQuery,
  parseTypeId,
  fetchCentrality,
  fetchPaths,
  fetchIntersection,
  fetchGraphSchema,
  fetchGraphStats,
  searchEntities,
  type EntityRef,
  type SubgraphEdge,
  type SubgraphApiResponse,
  type FetchSubgraphOptions,
  type GraphQueryStep,
  type GraphQueryOptions,
  type GraphQueryResponse,
  type CentralityResponse,
  type PathNode,
  type PathEdge,
  type PathResult,
  type PathsResponse,
  type FetchPathsOptions,
  type SharedNeighbor,
  type IntersectResponse,
  type FetchIntersectionOptions,
  type GraphSchemaResponse,
  type GraphStatsResponse,
  type SearchResultEntity,
  type EntitySearchResponse,
} from "@features/graph/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * API response structure for gene queries
 */
export interface GeneApiResponse {
  data: Gene;
  meta?: {
    direction?: string;
    limitPerEdgeType?: number;
    edgeTypes?: string[] | string | null;
    nextCursorEdges?: Record<string, string> | null;
    summaryEdgeTypesUsed?: {
      agreements?: string[] | null;
      rollups?: string[] | null;
    } | null;
    warnings?: Array<Record<string, unknown>> | null;
    [key: string]: unknown;
  };
  included?: {
    agreements?: Record<string, unknown> | null;
    counts?: Record<string, unknown> | null;
    relations?: Record<string, unknown> | null;
    rollups?: Record<string, unknown> | null;
    [key: string]: unknown;
  } | null;
  relations?: Record<string, unknown> | null;
  edges?: unknown;
  counts?: Record<string, unknown> | null;
  rollups?: Record<string, unknown> | null;
  agreements?: Record<string, unknown> | null;
}

/**
 * Options for fetching gene data from the graph API
 */
export interface FetchGeneOptions {
  include?: string;
  edgeTypes?: string;
  direction?: string;
  limitPerEdgeType?: number;
  cursorEdges?: string;
  neighborMode?: string;
  sort?: string;
  filter?: string;
  agreementInclude?: string;
  agreementSort?: string;
  limitAgreements?: number;
  cursorAgreements?: string;
}

/**
 * Fetches gene data from the graph API
 */
export async function fetchGene(
  id: string,
  options?: FetchGeneOptions,
): Promise<GeneApiResponse | null> {
  if (!id) return null;

  const params = new URLSearchParams();

  if (options?.include) params.set("include", options.include);
  if (options?.edgeTypes) params.set("edgeTypes", options.edgeTypes);
  if (options?.direction) params.set("direction", options.direction);
  if (options?.limitPerEdgeType)
    params.set("limitPerEdgeType", String(options.limitPerEdgeType));
  if (options?.cursorEdges) params.set("cursorEdges", options.cursorEdges);
  if (options?.neighborMode) params.set("neighborMode", options.neighborMode);
  if (options?.sort) params.set("sort", options.sort);
  if (options?.filter) params.set("filter", options.filter);
  if (options?.agreementInclude)
    params.set("agreementInclude", options.agreementInclude);
  if (options?.agreementSort) params.set("agreementSort", options.agreementSort);
  if (options?.limitAgreements)
    params.set("limitAgreements", String(options.limitAgreements));
  if (options?.cursorAgreements)
    params.set("cursorAgreements", options.cursorAgreements);

  const queryString = params.toString();
  const url = `${API_BASE}/graph/gene/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ""}`;

  const response = await fetchOrNull<GeneApiResponse>(url);
  return response ?? null;
}

// =============================================================================
// Pathway Enrichment API
// =============================================================================

import { fetchSubgraph } from "@features/graph/api";

/**
 * Response structure for pathway enrichment data
 */
export interface PathwayEnrichmentResponse {
  geneCount: number;
  sharedGenes: Array<{ id: string; symbol: string }>;
  relatedDiseases: Array<{ id: string; name: string }>;
  parentPathway: { id: string; name: string } | null;
  childPathways: Array<{ id: string; name: string }>;
}

interface PathwayRelationRows {
  PART_OF?: {
    rows: Array<{
      neighbor: { id: string; name?: string; label?: string; type: string };
    }>;
  };
  PARTICIPATES_IN?: {
    rows: Array<{
      neighbor: {
        id: string;
        name?: string;
        label?: string;
        symbol?: string;
        type: string;
      };
    }>;
  };
}

interface PathwayRelationsResponse {
  data: {
    pathway_id: string;
    pathway_name: string;
  };
  relations?: PathwayRelationRows;
  included?: {
    relations?: PathwayRelationRows;
  };
}

/** Extract relations from response (API returns at top-level or inside included) */
function getRelations(response: PathwayRelationsResponse | null): PathwayRelationRows | undefined {
  return response?.relations ?? response?.included?.relations;
}

export async function fetchPathwayEnrichment(
  pathwayId: string,
  seedGeneId: string,
): Promise<PathwayEnrichmentResponse | null> {
  try {
    const [parentResponse, childrenResponse, genesResponse] = await Promise.all([
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PART_OF&direction=out&limitPerEdgeType=5`,
        { next: { revalidate: 300 } },
      ),
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PART_OF&direction=in&limitPerEdgeType=20`,
        { next: { revalidate: 300 } },
      ),
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PARTICIPATES_IN&direction=in&limitPerEdgeType=100`,
        { next: { revalidate: 300 } },
      ),
    ]);

    const parentData: PathwayRelationsResponse | null = parentResponse.ok
      ? await parentResponse.json()
      : null;
    const childrenData: PathwayRelationsResponse | null = childrenResponse.ok
      ? await childrenResponse.json()
      : null;
    const genesData: PathwayRelationsResponse | null = genesResponse.ok
      ? await genesResponse.json()
      : null;

    const parentRelations = getRelations(parentData);
    const childRelations = getRelations(childrenData);
    const geneRelations = getRelations(genesData);

    // Extract parent: PART_OF direction=out means this pathway is the child (source),
    // neighbors are the parents. Filter out self-references.
    const parentRows = (parentRelations?.PART_OF?.rows ?? []).filter(
      (row) => row?.neighbor?.id && row.neighbor.id !== pathwayId,
    );
    const firstParent = parentRows[0]?.neighbor;
    const parentPathway = firstParent
      ? { id: firstParent.id, name: firstParent.name ?? firstParent.label ?? firstParent.id }
      : null;

    // Extract children: PART_OF direction=in means this pathway is the parent (target),
    // neighbors are the children. Filter out self-references.
    const childRows = (childRelations?.PART_OF?.rows ?? []).filter(
      (row) => row?.neighbor?.id && row.neighbor.id !== pathwayId,
    );
    const childPathways = childRows.map((row) => ({
      id: row.neighbor.id,
      name: row.neighbor.name ?? row.neighbor.label ?? row.neighbor.id,
    }));

    const geneRows = geneRelations?.PARTICIPATES_IN?.rows ?? [];
    const genes = geneRows.filter(
      (row) => row?.neighbor?.type === "Gene",
    );
    const geneCount = genes.length;

    const sharedGenes = genes
      .filter(
        (g) => g.neighbor.id !== seedGeneId,
      )
      .slice(0, 10)
      .map(
        (g) => ({
          id: g.neighbor.id,
          symbol: g.neighbor.symbol ?? g.neighbor.name ?? g.neighbor.label ?? g.neighbor.id,
        }),
      );

    const subgraphResponse = await fetchSubgraph({
      seeds: [{ type: "Pathway", id: pathwayId }],
      maxDepth: 1,
      edgeTypes: ["ASSOCIATED_WITH"],
      nodeLimit: 50,
      edgeLimit: 50,
      includeProps: false,
    });

    const diseaseNodes = subgraphResponse?.data?.graph?.nodes ?? [];
    const relatedDiseases = diseaseNodes
      .filter((n) => n.type === "Disease")
      .slice(0, 10)
      .map((d) => ({
        id: d.id,
        name: d.label,
      }));

    return {
      geneCount,
      sharedGenes,
      relatedDiseases,
      parentPathway,
      childPathways,
    };
  } catch (error) {
    console.error("Pathway enrichment fetch error:", error);
    return null;
  }
}

// =============================================================================
// Pathway Disease Enrichment API
// =============================================================================

export interface PathwayDiseaseAssociation {
  disease: { id: string; name: string };
  geneCount: number;
  genes: Array<{ id: string; symbol: string }>;
}

export interface PathwayDiseaseEnrichmentResponse {
  totalDiseases: number;
  diseases: PathwayDiseaseAssociation[];
}

export async function fetchPathwayDiseaseEnrichment(
  pathwayId: string,
): Promise<PathwayDiseaseEnrichmentResponse | null> {
  try {
    const subgraphResponse = await fetchSubgraph({
      seeds: [{ type: "Pathway", id: pathwayId }],
      maxDepth: 2,
      edgeTypes: ["PARTICIPATES_IN", "ASSOCIATED_WITH_DISEASE"],
      nodeLimit: 500,
      edgeLimit: 1000,
      includeProps: false,
    });

    if (!subgraphResponse?.data?.graph) {
      return null;
    }

    const edges = subgraphResponse.data.graph.edges;

    if (edges.length === 0) {
      console.warn(`fetchPathwayDiseaseEnrichment: no edges returned for ${pathwayId}`);
      return { totalDiseases: 0, diseases: [] };
    }

    const pathwayGenes = new Set<string>();
    const geneMap = new Map<string, { id: string; symbol: string }>();

    let participatesInCount = 0;
    let participatesInMatchCount = 0;

    for (const edge of edges) {
      if (edge.type === "PARTICIPATES_IN") {
        participatesInCount++;
        if (edge.to.id === pathwayId && edge.from.type === "Gene") {
          participatesInMatchCount++;
          pathwayGenes.add(edge.from.id);
          geneMap.set(edge.from.id, {
            id: edge.from.id,
            symbol: edge.from.label,
          });
        }
      }
    }

    if (participatesInCount > 0 && participatesInMatchCount === 0) {
      console.warn(
        `fetchPathwayDiseaseEnrichment: Found ${participatesInCount} PARTICIPATES_IN edges ` +
        `but none matched expected direction (Gene → Pathway with to.id === ${pathwayId}). ` +
        `Check if API returns edges in reverse direction.`
      );
    }

    const diseaseToGenes = new Map<string, Set<string>>();
    const diseaseMap = new Map<string, { id: string; name: string }>();

    let implicatedInCount = 0;
    let implicatedInMatchCount = 0;

    for (const edge of edges) {
      if (edge.type === "ASSOCIATED_WITH_DISEASE") {
        implicatedInCount++;
        const geneId = edge.from.id;
        const diseaseNode = edge.to;

        if (pathwayGenes.has(geneId) && diseaseNode.type === "Disease") {
          implicatedInMatchCount++;
          if (!diseaseToGenes.has(diseaseNode.id)) {
            diseaseToGenes.set(diseaseNode.id, new Set());
            diseaseMap.set(diseaseNode.id, {
              id: diseaseNode.id,
              name: diseaseNode.label,
            });
          }
          diseaseToGenes.get(diseaseNode.id)!.add(geneId);
        }
      }
    }

    if (implicatedInCount > 0 && implicatedInMatchCount === 0 && pathwayGenes.size > 0) {
      console.warn(
        `fetchPathwayDiseaseEnrichment: Found ${implicatedInCount} ASSOCIATED_WITH_DISEASE edges ` +
        `but none matched pathway genes. Check if API returns edges in reverse direction.`
      );
    }

    const diseases: PathwayDiseaseAssociation[] = Array.from(diseaseToGenes.entries())
      .map(([diseaseId, geneIds]) => {
        const disease = diseaseMap.get(diseaseId)!;
        const genes = Array.from(geneIds)
          .slice(0, 10)
          .map((geneId) => geneMap.get(geneId) ?? { id: geneId, symbol: geneId });

        return {
          disease,
          geneCount: geneIds.size,
          genes,
        };
      })
      .sort((a, b) => b.geneCount - a.geneCount)
      .slice(0, 20);

    return {
      totalDiseases: diseaseToGenes.size,
      diseases,
    };
  } catch (error) {
    console.error("Pathway disease enrichment fetch error:", error);
    return null;
  }
}
