import type { GeneLevelAnnotation } from "../types";

export const GENE_ANNOTATION_URL = "https://api.genohub.org/v1/annotations";

export async function fetchGeneAnnotation(
  geneName: string,
): Promise<GeneLevelAnnotation | null> {
  try {
    const response = await fetch(`${GENE_ANNOTATION_URL}/${geneName}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch gene annotation: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as GeneLevelAnnotation;
  } catch (error) {
    console.error("Error fetching gene annotation:", error);
    return null;
  }
}
