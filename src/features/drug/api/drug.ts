import { API_BASE } from "@/config/api";
import type { DrugEntityResponse } from "../types";

/** Edge types to fetch for the drug detail page */
const DRUG_EDGE_TYPES = [
  "DRUG_ACTS_ON_GENE",
  "DRUG_INDICATED_FOR_DISEASE",
  "DRUG_DISPOSITION_BY_GENE",
  "GENE_AFFECTS_DRUG_RESPONSE",
  "DRUG_HAS_ADVERSE_EFFECT",
  "DRUG_INTERACTS_WITH_DRUG",
];

/**
 * Fetch a drug entity from the knowledge graph with edge data and counts.
 * Uses the graph entity endpoint for richer data than the legacy /drugs/ endpoint.
 */
export async function fetchDrugEntity(
  chemblId: string,
): Promise<DrugEntityResponse | null> {
  if (!chemblId) return null;

  const params = new URLSearchParams({
    mode: "full",
    include: "edges,counts",
    edgeTypes: DRUG_EDGE_TYPES.join(","),
    limitPerEdgeType: "200",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(
      `${API_BASE}/graph/Drug/${encodeURIComponent(chemblId)}?${params}`,
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
