import type { Variant } from "./types";

const VARIANT_URL = "https://api.genohub.org/v1/variants";
const RSID_URL = "https://api.genohub.org/v1/rsids";

export async function fetchVariant(vcf: string): Promise<Variant | null> {
  try {
    const response = await fetch(`${VARIANT_URL}/${vcf}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch variant data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching variant data:", error);
    return null;
  }
}

export async function fetchVariantsByRsid(
  rsid: string,
): Promise<Variant[] | null> {
  try {
    const response = await fetch(`${RSID_URL}/${rsid}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch variants by RSID: ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching variants by RSID:", error);
    return null;
  }
}
