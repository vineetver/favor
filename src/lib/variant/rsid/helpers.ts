import type { Variant } from "@/lib/variant/api";

export function selectVariantFromList(
  variants: Variant[],
  selectedVariantVcf?: string,
): Variant | null {
  if (!variants || variants.length === 0) {
    return null;
  }

  if (selectedVariantVcf) {
    const foundVariant = variants.find(
      (v) => v.variant_vcf === selectedVariantVcf,
    );
    if (foundVariant) {
      return foundVariant;
    }
  }

  return variants[0];
}

export function validateVariantForRsid(
  variants: Variant[],
  selectedVariantVcf?: string,
): string | null {
  if (!variants || variants.length === 0 || !selectedVariantVcf) {
    return null;
  }

  const foundVariant = variants.find(
    (v) => v.variant_vcf === selectedVariantVcf,
  );
  return foundVariant ? selectedVariantVcf : null;
}

export function formatVariantForDisplay(variant: Variant): string {
  return variant.variant_vcf;
}

export function getRsidBasePath(rsid: string, category: string): string {
  return `/hg38/rsid/${encodeURIComponent(rsid)}/${category}`;
}
