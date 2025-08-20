import type { ScentTissue } from "@/lib/variant/scent/types";

const SCENTissue = "https://api.genohub.org/v1/tissues/scent";

export async function fetchScentTissueByVCF(
  vcf: string,
  distance: number = 0,
): Promise<ScentTissue[] | null> {
  try {
    const response = await fetch(
      `${SCENTissue}/vcf/${vcf}?distance=${distance}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch Scent tissue data: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Scent tissue data:", error);
    return null;
  }
}

export async function fetchScentTissueByRegion(
  region: string,
  distance: number = 0,
): Promise<ScentTissue[] | null> {
  try {
    const response = await fetch(
      `${SCENTissue}/region/${region}?distance=${distance}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch Scent tissue data: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Scent tissue data:", error);
    return null;
  }
}
