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
 * ## Edge Direction Assumptions
 * This function assumes the following edge directions from the Graph API:
 * - `PART_OF`: Pathway → Parent Pathway (direction=in from child gets parent)
 * - `PARTICIPATES_IN`: Gene → Pathway (direction=in from pathway gets genes)
 *
 * If the API returns edges in opposite directions, the filtering will silently
 * return empty data. Verify edge directions with test calls if data is missing.
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

    // Parse responses with defensive null checks
    const parentData: PathwayRelationsResponse | null = parentResponse.ok
      ? await parentResponse.json()
      : null;
    const childrenData: PathwayRelationsResponse | null = childrenResponse.ok
      ? await childrenResponse.json()
      : null;
    const genesData: PathwayRelationsResponse | null = genesResponse.ok
      ? await genesResponse.json()
      : null;

    // Validate response structures - log warnings if unexpected
    if (parentResponse.ok && !parentData?.included?.relations) {
      console.warn(`fetchPathwayEnrichment: parent response missing relations for ${pathwayId}`);
    }
    if (childrenResponse.ok && !childrenData?.included?.relations) {
      console.warn(`fetchPathwayEnrichment: children response missing relations for ${pathwayId}`);
    }
    if (genesResponse.ok && !genesData?.included?.relations) {
      console.warn(`fetchPathwayEnrichment: genes response missing relations for ${pathwayId}`);
    }

    // Extract parent pathway (first parent from direction=in PART_OF)
    // Note: PART_OF direction assumptions - if empty, verify API edge direction semantics
    const parentRows = parentData?.included?.relations?.PART_OF?.rows ?? [];
    const parentPathway =
      parentRows.length > 0 && parentRows[0]?.neighbor?.id && parentRows[0]?.neighbor?.name
        ? { id: parentRows[0].neighbor.id, name: parentRows[0].neighbor.name }
        : null;

    // Extract child pathways (from direction=out PART_OF)
    const childRows = childrenData?.included?.relations?.PART_OF?.rows ?? [];
    const childPathways = childRows
      .filter((row) => row?.neighbor?.id && row?.neighbor?.name)
      .map((row) => ({
        id: row.neighbor.id,
        name: row.neighbor.name,
      }));

    // Extract genes (from direction=in PARTICIPATES_IN)
    // Note: PARTICIPATES_IN direction assumptions - Gene → Pathway (traverse in from Pathway)
    const geneRows = genesData?.included?.relations?.PARTICIPATES_IN?.rows ?? [];
    const genes = geneRows.filter(
      (row: { neighbor: { type: string } }) => row?.neighbor?.type === "Gene",
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

// =============================================================================
// Pathway Disease Enrichment API (2-step traversal)
// =============================================================================

/**
 * Disease association from pathway genes
 */
export interface PathwayDiseaseAssociation {
  disease: { id: string; name: string };
  geneCount: number; // Number of pathway genes associated with this disease
  genes: Array<{ id: string; symbol: string }>; // Up to 10 genes
}

/**
 * Response structure for pathway disease enrichment
 */
export interface PathwayDiseaseEnrichmentResponse {
  totalDiseases: number;
  diseases: PathwayDiseaseAssociation[];
}

/**
 * Fetches disease associations for a pathway using 2-step traversal.
 * Pathway → genes → diseases, aggregated and ranked by gene overlap.
 *
 * ## Edge Direction Assumptions (CRITICAL)
 * This function assumes the following edge directions from the Graph API:
 * - `PARTICIPATES_IN`: Gene → Pathway (edge.to.id === pathwayId means gene participates)
 * - `IMPLICATED_IN`: Gene → Disease (edge.from.id is gene, edge.to is disease)
 *
 * **WARNING**: If the API returns edges in the opposite direction, the filtering
 * at lines 647-665 will silently fail and return empty data. This can cause:
 * - Empty gene sets (pathwayGenes.size === 0)
 * - Empty disease associations (diseaseToGenes.size === 0)
 *
 * To verify edge directions, test with:
 * ```bash
 * curl "$API_URL/graph/subgraph" -X POST -H "Content-Type: application/json" \
 *   -d '{"seeds":[{"type":"Pathway","id":"R-HSA-1059683"}],"maxDepth":1,"edgeTypes":["PARTICIPATES_IN"]}'
 * ```
 * Check if edges have from.type === "Gene" and to.id === pathwayId.
 *
 * @param pathwayId - Pathway ID (e.g., "R-HSA-5693532")
 * @returns Disease enrichment data or null on error
 */
export async function fetchPathwayDiseaseEnrichment(
  pathwayId: string,
): Promise<PathwayDiseaseEnrichmentResponse | null> {
  try {
    // Use subgraph with 2-step traversal: Pathway → genes → diseases
    // PARTICIPATES_IN: Gene → Pathway (traverse in from Pathway to get genes)
    // IMPLICATED_IN: Gene → Disease (traverse out from genes to get diseases)
    const subgraphResponse = await fetchSubgraph({
      seeds: [{ type: "Pathway", id: pathwayId }],
      maxDepth: 2,
      edgeTypes: ["PARTICIPATES_IN", "IMPLICATED_IN"],
      nodeLimit: 500,
      edgeLimit: 1000,
      includeProps: false,
    });

    if (!subgraphResponse?.data?.graph) {
      return null;
    }

    const edges = subgraphResponse.data.graph.edges;

    // Validate we have edges to process
    if (edges.length === 0) {
      console.warn(`fetchPathwayDiseaseEnrichment: no edges returned for ${pathwayId}`);
      return { totalDiseases: 0, diseases: [] };
    }

    // Build gene set from pathway
    const pathwayGenes = new Set<string>();
    const geneMap = new Map<string, { id: string; symbol: string }>();

    // Track edge direction for debugging
    let participatesInCount = 0;
    let participatesInMatchCount = 0;

    for (const edge of edges) {
      if (edge.type === "PARTICIPATES_IN") {
        participatesInCount++;
        // Gene participates in pathway (Gene → Pathway)
        // CRITICAL: This assumes edge direction is Gene → Pathway
        // If edge direction is reversed, this will silently fail
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

    // Warn if we found PARTICIPATES_IN edges but none matched our direction assumption
    if (participatesInCount > 0 && participatesInMatchCount === 0) {
      console.warn(
        `fetchPathwayDiseaseEnrichment: Found ${participatesInCount} PARTICIPATES_IN edges ` +
        `but none matched expected direction (Gene → Pathway with to.id === ${pathwayId}). ` +
        `Check if API returns edges in reverse direction.`
      );
    }

    // Build disease -> genes map
    const diseaseToGenes = new Map<string, Set<string>>();
    const diseaseMap = new Map<string, { id: string; name: string }>();

    // Track for debugging
    let implicatedInCount = 0;
    let implicatedInMatchCount = 0;

    for (const edge of edges) {
      if (edge.type === "IMPLICATED_IN") {
        implicatedInCount++;
        // Gene implicated in disease (Gene → Disease)
        // CRITICAL: This assumes edge direction is Gene → Disease
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

    // Warn if we found IMPLICATED_IN edges but none matched pathway genes
    if (implicatedInCount > 0 && implicatedInMatchCount === 0 && pathwayGenes.size > 0) {
      console.warn(
        `fetchPathwayDiseaseEnrichment: Found ${implicatedInCount} IMPLICATED_IN edges ` +
        `but none matched pathway genes. Check if API returns edges in reverse direction.`
      );
    }

    // Convert to array and sort by gene count
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

// =============================================================================
// Graph Schema API (Graph Explorer)
// =============================================================================

/**
 * Graph schema response structure
 */
export interface GraphSchemaResponse {
  data: {
    nodeTypes: string[];
    edgeTypes: Array<{
      type: string;
      count: number;
      sourceTypes: string[];
      targetTypes: string[];
    }>;
    lastUpdated?: string;
  };
}

/**
 * Fetches the graph schema (available node/edge types)
 * @returns Graph schema or null if not found
 */
export async function fetchGraphSchema(): Promise<GraphSchemaResponse | null> {
  const url = `${API_BASE}/graph/schema`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour (schema is stable)
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Graph schema fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Graph schema fetch error:", error);
    return null;
  }
}

// =============================================================================
// Graph Stats API (Graph Explorer)
// =============================================================================

/**
 * Graph stats response structure
 */
export interface GraphStatsResponse {
  data: {
    totalNodes: number;
    totalEdges: number;
    nodeCounts: Record<string, number>;
    edgeCounts: Record<string, number>;
  };
}

/**
 * Fetches global graph statistics
 * @returns Graph stats or null if not found
 */
export async function fetchGraphStats(): Promise<GraphStatsResponse | null> {
  const url = `${API_BASE}/graph/stats`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      console.error(`Graph stats fetch failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Graph stats fetch error:", error);
    return null;
  }
}

// =============================================================================
// Entity Search API (Graph Explorer)
// =============================================================================

/**
 * Search result entity
 */
export interface SearchResultEntity {
  type: string;
  id: string;
  label: string;
  score: number;
}

/**
 * Entity search response
 */
export interface EntitySearchResponse {
  data: {
    results: SearchResultEntity[];
    totalCount: number;
  };
}

/**
 * Search for entities in the knowledge graph
 * @param query - Search query
 * @param types - Entity types to search (optional)
 * @param limit - Maximum results (default: 20)
 * @returns Search results or null on error
 */
export async function searchEntities(
  query: string,
  types?: string[],
  limit: number = 20,
): Promise<EntitySearchResponse | null> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  if (types?.length) {
    params.set("types", types.join(","));
  }

  const url = `${API_BASE}/graph/search?${params.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`Entity search failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Entity search error:", error);
    return null;
  }
}
