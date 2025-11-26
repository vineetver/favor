import type { Crispr } from "./types";

const CRISPR_URL = "https://api.genohub.org/v1/crispr/vcf";

export async function fetchCRISPR(vcf: string): Promise<Crispr[] | null> {
  try {
    const response = await fetch(`${CRISPR_URL}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CRISPR data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching CRISPR data:", error);
    return null;
  }
}
