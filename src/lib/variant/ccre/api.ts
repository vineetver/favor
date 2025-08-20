import type { CCRE, CCRETissue } from "@/lib/variant/ccre/types";

const CCRE_BASE_URL = "https://api.genohub.org/v1/tissues/ccre";
const CCRE_TISSUE_URL = "https://api.genohub.org/v1/tissues/ccre/tissue";

export async function getCCREByVCF(
  vcf: string,
  distance: number = 0,
): Promise<CCRE[] | null> {
  try {
    const response = await fetch(
      `${CCRE_BASE_URL}/vcf/${vcf}?distance=${distance}`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CCRE data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching CCRE data:", error);
    return null;
  }
}

export async function getCCRETissueByVCF(
  vcf: string,
  distance: number = 0,
  tissue?: string,
  subtissue?: string,
): Promise<CCRETissue[] | null> {
  try {
    const params = new URLSearchParams({
      distance: distance.toString(),
    });

    if (tissue) params.append("tissue", tissue);
    if (subtissue) params.append("subtissue", subtissue);

    const response = await fetch(`${CCRE_TISSUE_URL}/vcf/${vcf}?${params}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch CCRE tissue data: ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching CCRE tissue data:", error);
    return null;
  }
}

export async function getCCREByRegion(
  region: string,
  distance: number = 0,
): Promise<CCRE[] | null> {
  try {
    const response = await fetch(
      `${CCRE_BASE_URL}/region/${region}?distance=${distance}`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch CCRE data: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching CCRE data:", error);
    return null;
  }
}

export async function getCCRETissueByRegion(
  region: string,
  distance: number = 0,
  tissue?: string,
  subtissue?: string,
): Promise<CCRETissue[] | null> {
  try {
    const params = new URLSearchParams({
      distance: distance.toString(),
    });

    if (tissue) params.append("tissue", tissue);
    if (subtissue) params.append("subtissue", subtissue);

    const response = await fetch(`${CCRE_BASE_URL}/region/${region}?${params}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch CCRE tissue data: ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching CCRE tissue data:", error);
    return null;
  }
}
