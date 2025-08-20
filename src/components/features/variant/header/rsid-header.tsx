"use client";

import { useOptimistic, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/general";
import type { Variant } from "@/lib/variant/api";
import { setRsidVariantCookie } from "@/lib/variant/actions";

interface RsidHeaderProps {
  rsid: string;
  variants: Variant[];
  selectedVariant: Variant;
}

export function RsidHeader({
  rsid,
  variants,
  selectedVariant,
}: RsidHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticVariantVcf, setOptimisticVariantVcf] = useOptimistic(
    selectedVariant.variant_vcf,
  );

  const handleVariantChange = (variantVcf: string) => {
    if (variantVcf === optimisticVariantVcf) return;

    setOptimisticVariantVcf(variantVcf);
    startTransition(async () => {
      await setRsidVariantCookie(rsid, variantVcf);
      window.location.reload();
    });
  };

  const currentVariant =
    variants.find((v) => v.variant_vcf === optimisticVariantVcf) ||
    selectedVariant;
  const vcfParts = currentVariant.variant_vcf.split("-");

  if (vcfParts.length < 4) {
    return (
      <div className="py-6">
        <div className="space-y-4 md:flex md:items-center md:justify-between md:space-y-0">
          <div>
            <h3 className="text-2xl font-semibold mt-2">
              Invalid variant format: {currentVariant.variant_vcf}
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
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-semibold mt-2">{rsid}</h3>
            <Tabs
              value={optimisticVariantVcf}
              onValueChange={handleVariantChange}
            >
              <TabsList className="h-8 p-1 bg-primary/5 border border-border/50 rounded-lg w-fit">
                {variants.map((variant) => (
                  <TabsTrigger
                    key={variant.variant_vcf}
                    value={variant.variant_vcf}
                    disabled={isPending}
                    className={cn(
                      "font-mono text-xs px-2 py-1 rounded-md transition-all",
                      "data-[state=active]:bg-background data-[state=active]:text-foreground",
                      "data-[state=active]:shadow-sm hover:bg-background/90",
                      "disabled:opacity-50 cursor-pointer",
                    )}
                  >
                    {variant.variant_vcf}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col text-sm text-muted-foreground space-y-1">
        <span>Reference allele: {refAllele}</span>
        <span>Alternative allele (effect allele): {altAllele}</span>
      </div>
    </div>
  );
}
