import type { Eqtl } from "@/lib/variant/eqtl/types";

const EQTL_URL = "https://api.genohub.org/v1/eqtl/vcf";

export async function fetchEQTL(vcf: string): Promise<Eqtl[] | null> {
  try {
    const response = await fetch(`${EQTL_URL}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch eQTL data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching eQTL data:", error);
    return null;
  }
}
