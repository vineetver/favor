import type { CcreEntityResponse } from "../types";

import { API_BASE } from "@/config/api";

/** Edge types to fetch for the cCRE detail page */
const CCRE_EDGE_TYPES = [
  "CCRE_REGULATES_GENE",
  "VARIANT_OVERLAPS_CCRE",
];

/**
 * Fetch a cCRE entity from the knowledge graph with edge data and counts.
 * Uses the graph entity endpoint for full node + edge data.
 */
export async function fetchCcreEntity(
  ccreId: string,
): Promise<CcreEntityResponse | null> {
  if (!ccreId) return null;

  const params = new URLSearchParams({
    mode: "full",
    include: "edges,counts",
    edgeTypes: CCRE_EDGE_TYPES.join(","),
    limitPerEdgeType: "200",
  });

  try {
    const response = await fetch(
      `${API_BASE}/graph/cCRE/${encodeURIComponent(ccreId)}?${params}`,
      { credentials: "include", next: { revalidate: 300 } },
    );

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
