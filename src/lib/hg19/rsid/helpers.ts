import type { VariantHg19 } from "../variant/types";

export function selectVariantFromList(
  variants: VariantHg19[],
  preferredVcf?: string,
): VariantHg19 | null {
  if (!variants || variants.length === 0) {
    return null;
  }

  // If a preferred variant is specified and found, return it
  if (preferredVcf) {
    const preferred = variants.find((v) => v.variant_vcf === preferredVcf);
    if (preferred) {
      return preferred;
    }
  }

  // Otherwise return the first variant
  return variants[0];
}

export function validateVariantForRsid(
  variants: VariantHg19[],
  variantVcf?: string,
): string | null {
  if (!variantVcf || !variants || variants.length === 0) {
    return null;
  }

  const exists = variants.some((v) => v.variant_vcf === variantVcf);
  return exists ? variantVcf : null;
}

export function getRsidBasePath(rsid: string, category: string): string {
  return `/hg19/rsid/${encodeURIComponent(rsid)}/${category}`;
}
