import type { Gene } from "../types";
import { fetchOrNull } from "@infra/api";

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
  /** Optional expansions to include in the response payload (counts, edges, rollups, agreements) */
  include?: string;
  /** Filter edges by edge type (comma-separated) */
  edgeTypes?: string;
  /** Edge direction to traverse (default: both) */
  direction?: string;
  /** Maximum edges per type (1-500, default: 50) */
  limitPerEdgeType?: number;
  /** Pagination cursor for edges (use page_info.next_cursor) */
  cursorEdges?: string;
  /** Edge-specific neighbor mode (EDGE_TYPE=id|summary|full) */
  neighborMode?: string;
  /** JSON map of edge type to sort field (prefix "-" for desc) */
  sort?: string;
  /** JSON map of edge type to filters (e.g., {"EDGE":{"score__gte":0.8}}) */
  filter?: string;
  /** Agreement expansion (entity, evidence) */
  agreementInclude?: string;
  /** Agreement sort field (prefix "-" for desc) */
  agreementSort?: string;
  /** Maximum agreement items (default: 100) */
  limitAgreements?: number;
  /** Pagination cursor for agreements */
  cursorAgreements?: string;
}

/**
 * Fetches gene data from the graph API
 * @param id - Ensembl gene ID or gene symbol (e.g., "ENSG00000130203" or "BRCA1")
 * @param options - Optional query parameters for the API
 * @returns Gene data or null if not found
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

/**
 * Entity reference format returned by subgraph endpoint
 */
export interface EntityRef {
  type: string;
  id: string;
  label: string;
  subtitle?: string;
}

/**
 * Edge in subgraph response (TraverseEdge from API)
 */
export interface SubgraphEdge {
  type: string;
  direction: "out" | "in";
  from: EntityRef;
  to: EntityRef;
  /** Edge properties (when includeProps: true) */
  props?: {
    src_symbol?: string;
    dst_symbol?: string;
    sources?: string[];
    num_sources?: number;
    num_experiments?: number;
    confidence_scores?: number[];
    pubmed_ids?: string[];
    detection_methods?: string[];
    interaction_type?: string;
    [key: string]: unknown;
  };
  /** Evidence data extracted from props */
  evidence?: {
    pubmedIds?: string[];
  };
}

/**
 * Subgraph API response structure
 */
export interface SubgraphApiResponse {
  meta: {
    requestId: string;
    generatedAt: string;
    warnings: string[];
  };
  data: {
    seeds: EntityRef[];
    graph: {
      nodes: EntityRef[];
      edges: SubgraphEdge[];
    };
    summary: {
      nodeCounts: Record<string, number>;
      edgeCounts: Record<string, number>;
      depthReached: number;
    };
  };
}

/**
 * Options for fetching subgraph data
 */
export interface FetchSubgraphOptions {
  /** Seed nodes to start traversal from */
  seeds: Array<{ type: string; id: string }>;
  /** Maximum traversal depth (default: 1) */
  maxDepth?: number;
  /** Edge types to traverse */
  edgeTypes?: string[];
  /** Maximum nodes to return */
  nodeLimit?: number;
  /** Maximum edges to return */
  edgeLimit?: number;
  /** Include edge properties in response (default: false) */
  includeProps?: boolean;
}

/**
 * Fetches subgraph data from the graph API
 * Returns nodes and edges in EntityRef format, ideal for visualization
 */
export async function fetchSubgraph(
  options: FetchSubgraphOptions,
): Promise<SubgraphApiResponse | null> {
  const url = `${API_BASE}/graph/subgraph`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seeds: options.seeds,
        maxDepth: options.maxDepth ?? 1,
        edgeTypes: options.edgeTypes,
        nodeLimit: options.nodeLimit ?? 100,
        edgeLimit: options.edgeLimit ?? 200,
        includeProps: options.includeProps ?? false,
      }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Subgraph fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Subgraph fetch error:", error);
    return null;
  }
}

// =============================================================================
// Centrality API (Hub Spotlight)
// =============================================================================

/**
 * Centrality response from the graph API
 */
export interface CentralityResponse {
  data: {
    entity: { type: string; id: string; label: string };
    degree: { in: number; out: number; total: number };
    percentile: { in: number; out: number; total: number };
    hubScore: number;
  };
}

/**
 * Fetches centrality metrics for a gene
 * @param type - Entity type (e.g., "Gene")
 * @param id - Entity ID (e.g., Ensembl gene ID)
 * @returns Centrality data or null if not found
 */
export async function fetchCentrality(
  type: string,
  id: string,
): Promise<CentralityResponse | null> {
  const url = `${API_BASE}/graph/${encodeURIComponent(type)}/${encodeURIComponent(id)}/centrality`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour (centrality is stable)
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Centrality fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Centrality fetch error:", error);
    return null;
  }
}

// =============================================================================
// Paths API (Connectivity Bridge)
// =============================================================================

/**
 * Path node in a path response
 */
export interface PathNode {
  type: string;
  id: string;
  label: string;
}

/**
 * Path edge in a path response
 */
export interface PathEdge {
  type: string;
  from: PathNode;
  to: PathNode;
}

/**
 * Single path in the paths response
 */
export interface PathResult {
  rank: number;
  length: number;
  pathText: string;
  nodes: PathNode[];
  edges: PathEdge[];
}

/**
 * Paths API response structure
 */
export interface PathsResponse {
  data: {
    from: PathNode;
    to: PathNode;
    paths: PathResult[];
  };
}

/**
 * Options for fetching paths between entities
 */
export interface FetchPathsOptions {
  maxHops?: number;
  limit?: number;
  edgeTypes?: string[];
}

/**
 * Fetches shortest paths between two entities
 * @param from - Source entity in format "Type:id" (e.g., "Gene:ENSG00000012048")
 * @param to - Target entity in format "Type:id"
 * @param options - Optional query parameters
 * @returns Paths data or null if not found
 */
export async function fetchPaths(
  from: string,
  to: string,
  options?: FetchPathsOptions,
): Promise<PathsResponse | null> {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);

  if (options?.maxHops) params.set("maxHops", String(options.maxHops));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.edgeTypes?.length) {
    params.set("edgeTypes", options.edgeTypes.join(","));
  }

  const url = `${API_BASE}/graph/paths?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Paths fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Paths fetch error:", error);
    return null;
  }
}

// =============================================================================
// Intersection API (Shared Interactors)
// =============================================================================

/**
 * Shared neighbor in intersection response
 */
export interface SharedNeighbor {
  neighbor: { type: string; id: string; label: string };
  support: Array<{
    from: { type: string; id: string; label: string };
    edge: { type: string };
  }>;
}

/**
 * Intersection API response structure
 */
export interface IntersectResponse {
  data: {
    inputs: Array<{ type: string; id: string; label: string }>;
    neighborType: string;
    sharedNeighbors: SharedNeighbor[];
    counts: { shared: number; limit: number };
  };
}

/**
 * Options for fetching intersection
 */
export interface FetchIntersectionOptions {
  /** Direction to traverse edges. Default: "out" */
  direction?: "in" | "out";
  limit?: number;
}

/**
 * Fetches shared neighbors (intersection) for multiple entities
 * @param entities - Array of entities to intersect
 * @param edgeType - Edge type to consider (e.g., "INTERACTS_WITH")
 * @param options - Optional query parameters
 * @returns Intersection data or null on error
 */
export async function fetchIntersection(
  entities: Array<{ type: string; id: string }>,
  edgeType: string,
  options?: FetchIntersectionOptions,
): Promise<IntersectResponse | null> {
  const url = `${API_BASE}/graph/intersect`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entities,
        edgeType,
        direction: options?.direction ?? "out",
        limit: options?.limit ?? 50,
      }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Intersection fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Intersection fetch error:", error);
    return null;
  }
}

// =============================================================================
// Pathway Enrichment API
// =============================================================================

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

/**
 * Pathway relations response structure
 */
interface PathwayRelationsResponse {
  data: {
    pathway_id: string;
    pathway_name: string;
  };
  included?: {
    relations?: {
      PART_OF?: {
        rows: Array<{
          neighbor: { id: string; name: string; type: string };
        }>;
      };
      PARTICIPATES_IN?: {
        rows: Array<{
          neighbor: {
            id: string;
            name?: string;
            symbol?: string;
            type: string;
          };
        }>;
      };
    };
  };
}

/**
 * Fetches enrichment data for a pathway (genes, diseases, hierarchy).
 * Uses parallel requests for performance with direction-aware PART_OF traversal.
 *
 * @param pathwayId - Pathway ID (e.g., "R-HSA-5693532")
 * @param seedGeneId - The seed gene ID to find shared genes
 * @returns Enriched pathway data or null on error
 */
export async function fetchPathwayEnrichment(
  pathwayId: string,
  seedGeneId: string,
): Promise<PathwayEnrichmentResponse | null> {
  try {
    // Parallel fetch: parent (direction=in), children (direction=out), and genes
    const [parentResponse, childrenResponse, genesResponse] = await Promise.all([
      // Get parent pathway using direction=in (traverse UP the hierarchy)
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PART_OF&direction=in&limitPerEdgeType=5`,
        { next: { revalidate: 300 } },
      ),
      // Get child pathways using direction=out (traverse DOWN the hierarchy)
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PART_OF&direction=out&limitPerEdgeType=20`,
        { next: { revalidate: 300 } },
      ),
      // Get genes participating in this pathway
      fetch(
        `${API_BASE}/graph/pathway/${encodeURIComponent(pathwayId)}?include=edges&edgeTypes=PARTICIPATES_IN&direction=in&limitPerEdgeType=100`,
        { next: { revalidate: 300 } },
      ),
    ]);

    // Parse responses
    const parentData: PathwayRelationsResponse | null = parentResponse.ok
      ? await parentResponse.json()
      : null;
    const childrenData: PathwayRelationsResponse | null = childrenResponse.ok
      ? await childrenResponse.json()
      : null;
    const genesData: PathwayRelationsResponse | null = genesResponse.ok
      ? await genesResponse.json()
      : null;

    // Extract parent pathway (first parent from direction=in PART_OF)
    const parentRows = parentData?.included?.relations?.PART_OF?.rows ?? [];
    const parentPathway =
      parentRows.length > 0
        ? { id: parentRows[0].neighbor.id, name: parentRows[0].neighbor.name }
        : null;

    // Extract child pathways (from direction=out PART_OF)
    const childRows = childrenData?.included?.relations?.PART_OF?.rows ?? [];
    const childPathways = childRows.map((row) => ({
      id: row.neighbor.id,
      name: row.neighbor.name,
    }));

    // Extract genes (from direction=in PARTICIPATES_IN)
    const geneRows = genesData?.included?.relations?.PARTICIPATES_IN?.rows ?? [];
    const genes = geneRows.filter(
      (row: { neighbor: { type: string } }) => row.neighbor.type === "Gene",
    );
    const geneCount = genes.length;

    // Find shared genes (exclude the seed gene)
    // Note: gene symbol is in neighbor.symbol, not neighbor.name
    const sharedGenes = genes
      .filter(
        (g: { neighbor: { id: string } }) => g.neighbor.id !== seedGeneId,
      )
      .slice(0, 10)
      .map(
        (g: { neighbor: { id: string; symbol?: string; name?: string } }) => ({
          id: g.neighbor.id,
          symbol: g.neighbor.symbol ?? g.neighbor.name ?? g.neighbor.id,
        }),
      );

    // For diseases, use the subgraph approach (ASSOCIATED_WITH is less common)
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
