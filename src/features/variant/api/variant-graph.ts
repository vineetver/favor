import { API_BASE } from "@/config/api";

// ============================================================================
// Shared types for graph entity responses
// ============================================================================

export interface EdgeNeighbor {
  type: string;
  id: string;
  [key: string]: unknown;
}

export interface EdgeLink {
  type: string;
  direction: string;
  from: { type: string; id: string };
  to: { type: string; id: string };
  props: Record<string, unknown>;
}

export interface EdgeRow {
  neighbor: EdgeNeighbor;
  link: EdgeLink;
}

export interface EdgeRelation {
  direction: string;
  neighbor_mode: string;
  rows: EdgeRow[];
}

export type EdgeRelations = Record<string, EdgeRelation>;
export type EdgeCounts = Record<string, number>;

export interface VariantGraphResponse {
  data: Record<string, unknown>;
  included?: {
    counts?: EdgeCounts;
    relations?: EdgeRelations;
  };
  meta?: Record<string, unknown>;
}

// ============================================================================
// Fetcher
// ============================================================================

/**
 * Fetch a variant entity from the knowledge graph with edge data.
 * Mirrors the fetchDiseaseEntity / fetchGene pattern.
 *
 * @param neighborModes optional per-edge-type neighbor expansion (e.g.
 *   { SIGNAL_HAS_VARIANT: "full" }) — inlines the full neighbor node in the
 *   edge summary instead of the default summary projection.
 */
export async function fetchVariantGraph(
  vcf: string,
  edgeTypes: string[],
  limitPerEdgeType = 500,
  neighborModes?: Record<string, "full" | "standard" | "summary">,
): Promise<VariantGraphResponse | null> {
  if (!vcf) return null;

  const params = new URLSearchParams({
    mode: "full",
    include: "edges,counts",
    edgeTypes: edgeTypes.join(","),
    limitPerEdgeType: String(limitPerEdgeType),
  });
  if (neighborModes && Object.keys(neighborModes).length > 0) {
    params.set(
      "neighborMode",
      Object.entries(neighborModes)
        .map(([et, mode]) => `${et}=${mode}`)
        .join(","),
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(
      `${API_BASE}/graph/Variant/${encodeURIComponent(vcf)}?${params}`,
      { signal: controller.signal, next: { revalidate: 300 } },
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/** Get edge rows for a specific edge type from the response */
export function getEdgeRows(
  response: VariantGraphResponse | null,
  edgeType: string,
): EdgeRow[] {
  return response?.included?.relations?.[edgeType]?.rows ?? [];
}

/** Extract edge property */
export function ep<T = unknown>(row: EdgeRow, key: string): T | undefined {
  return row.link.props[key] as T | undefined;
}

/** Extract neighbor property */
export function nb<T = unknown>(row: EdgeRow, key: string): T | undefined {
  return (row.neighbor as Record<string, unknown>)[key] as T | undefined;
}
