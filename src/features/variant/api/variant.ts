import type {
  AmbiguousVariantResponse,
  Variant,
  VariantSingleResponse,
} from "@features/variant/types";
import { fetchOrNull } from "@infra/api";

import { API_BASE } from "@/config/api";

/**
 * Detect if identifier is rsID (e.g., rs7412) or VCF format (e.g., 19-44908684-T-C)
 */
export function isRsid(identifier: string): boolean {
  return /^rs\d+$/i.test(identifier.trim());
}

/**
 * Result type for variant fetching - can be single variant or multiple (for rsID)
 */
export interface VariantFetchResult {
  /** Original identifier used for lookup */
  identifier: string;
  /** rsID if this was an rsID lookup, null otherwise */
  rsid: string | null;
  /** Whether this rsID has multiple alleles (ambiguous) */
  isAmbiguous: boolean;
  /** Array of variants (1 for VCF, 2-3 for ambiguous rsID) */
  variants: Variant[];
  /** Selected variant (for convenience) */
  selected: Variant;
}

/**
 * Check if response is ambiguous variant response
 */
function isAmbiguousResponse(
  response: unknown,
): response is AmbiguousVariantResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "ambiguous" in response &&
    (response as AmbiguousVariantResponse).ambiguous === true
  );
}

/**
 * Fetch variant(s) by identifier (VCF or rsID)
 * - For VCF: returns single variant
 * - For rsID: returns all variants (alleles) at that position if ambiguous
 */
export async function fetchVariant(
  identifier: string,
  selectedVcf?: string,
): Promise<VariantFetchResult | null> {
  if (!identifier) return null;

  const response = await fetchOrNull<VariantSingleResponse>(
    `${API_BASE}/variants/${encodeURIComponent(identifier)}?depth=detailed`,
  );

  if (!response) return null;

  // Check if this is an ambiguous rsID response
  if (isAmbiguousResponse(response)) {
    const candidates = response.candidates || [];
    if (candidates.length === 0) return null;

    // Select variant based on selectedVcf param or default to first
    let selected = candidates[0];
    if (selectedVcf && candidates.length > 1) {
      const found = candidates.find((v) => v.variant_vcf === selectedVcf);
      if (found) selected = found;
    }

    return {
      identifier,
      rsid: response.rsid || identifier,
      isAmbiguous: true,
      variants: candidates,
      selected,
    };
  }

  // Single variant response (could be VCF or non-ambiguous rsID)
  if ("error" in response) return null;

  const isRsidLookup = isRsid(identifier);
  const rsid = isRsidLookup ? identifier : response.dbsnp?.rsid || null;

  return {
    identifier,
    rsid,
    isAmbiguous: false,
    variants: [response],
    selected: response,
  };
}
