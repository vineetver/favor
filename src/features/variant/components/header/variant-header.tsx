import type { Variant } from "@/features/variant/types/types";

interface VariantHeaderProps {
  variant: Variant;
}

export function VariantHeader({ variant }: VariantHeaderProps) {
  if (!variant || !variant.variant_vcf) {
    return null;
  }

  const vcfParts = variant.variant_vcf.split("-");
  if (vcfParts.length < 4) {
    return (
      <div className="py-6">
        <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <h3 className="text-2xl font-semibold mt-2">
              Invalid variant format: {variant.variant_vcf}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const [, , refAllele, altAllele] = vcfParts;

  return (
    <div className="py-6">
      <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
        <div>
          <h3 className="text-2xl font-semibold mt-2">{variant.variant_vcf}</h3>
        </div>
      </div>
      <div className="mt-4 flex flex-col text-sm text-muted-foreground space-y-1">
        <span>rsID: {variant.rsid || "N/A"}</span>
        <span>Reference allele: {refAllele}</span>
        <span>Alternative allele (effect allele): {altAllele}</span>
      </div>
    </div>
  );
}
