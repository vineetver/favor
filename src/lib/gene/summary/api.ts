import type { GeneSummary, Summary } from "../types";

export const GENE_SUMMARY_URLS = (geneName: string) =>
  `https://api.genohub.org/v1/genes/${geneName}/summary`;

export async function fetchGeneSummary(
  geneName: string,
): Promise<GeneSummary | null> {
  try {
    const response = await fetch(GENE_SUMMARY_URLS(geneName));

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch gene summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data as GeneSummary;
  } catch (error) {
    console.error("Error fetching gene summary:", error);
    return null;
  }
}

export function getSummaryByCategory(
  geneSummary: GeneSummary,
  categorySlug: string,
): Summary {
  if (categorySlug === "SNV-summary") {
    return geneSummary.snv_summary;
  }

  if (categorySlug === "InDel-summary") {
    return geneSummary.indel_summary;
  }

  return geneSummary.total_summary;
}