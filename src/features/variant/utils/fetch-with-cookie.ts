import { cookies } from "next/headers";
import { fetchVariant, type VariantFetchResult } from "../api";

/**
 * Fetches variant with cookie-based selection for ambiguous rsIDs
 * Centralizes the cookie logic so all pages get consistent behavior
 */
export async function fetchVariantWithCookie(
  identifier: string,
): Promise<VariantFetchResult | null> {
  // First fetch to determine if ambiguous
  const result = await fetchVariant(identifier);

  if (!result) {
    return null;
  }

  // For ambiguous rsIDs, check cookie for user's previous selection
  if (result.isAmbiguous && result.rsid) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(`variant-${result.rsid}`)?.value;

    // Validate cookie value exists in variants list
    if (
      cookieValue &&
      result.variants.some((v) => v.variant_vcf === cookieValue)
    ) {
      // Re-fetch with selected VCF
      return await fetchVariant(identifier, cookieValue);
    }
  }

  return result;
}
