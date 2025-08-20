const pathway_pairs_url = "https://api.genohub.org/v1/interaction/pathwaypairs";
const pathway_genes_url = "https://api.genohub.org/v1/interaction/pathwaygenes";

export type PathwayInteraction = {
  degree: string;
  gene_interactor_a: string;
  gene_interactor_b: string;
  method: string;
  pathway: string;
  source: string;
  source_array: string[];
};

export type PathwayGenes = {
  pathway: string;
  gene_name: string;
  source: string;
};

export async function getPathwayPairs(
  geneName: string,
  limit?: number,
  source?: string,
): Promise<PathwayInteraction[] | null> {
  try {
    const response = await fetch(
      `${pathway_pairs_url}/${geneName}?limit=${limit}&source=${source}`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch pathway pairs: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching pathway pairs:", error);
    return null;
  }
}

export async function getPathwayGenes(
  geneName: string,
  source?: string,
): Promise<PathwayGenes[] | null> {
  try {
    const response = await fetch(
      `${pathway_genes_url}/${geneName}?source=${source}`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch pathway genes: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching pathway genes:", error);
    return null;
  }
}
