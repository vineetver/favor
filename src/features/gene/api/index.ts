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
  const url = `${API_BASE}/genes/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ""}`;

  const response = await fetchOrNull<GeneApiResponse>(url);
  return response ?? null;
}
