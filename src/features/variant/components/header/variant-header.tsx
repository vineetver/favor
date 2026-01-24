"use client";

import type { VariantFetchResult } from "@features/variant/api";
import { setVariantSelectionCookie } from "@features/variant/actions/variant-selection";
import { cn } from "@infra/utils";
import { Download, Share2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";

interface VariantHeaderProps {
  result: VariantFetchResult;
  genome?: "hg38" | "hg19";
}

export function VariantHeader({
  result,
  genome = "hg38",
}: VariantHeaderProps) {
  const [isPending, startTransition] = useTransition();

  // Optimistic UI - show selected variant immediately before reload
  const [optimisticVcf, setOptimisticVcf] = useOptimistic(
    result.selected?.variant_vcf ?? ""
  );

  const isRsidSearch =
    result.rsid !== null && result.identifier === result.rsid;
  const showAlleleSelector = result.isAmbiguous && result.variants.length > 1;

  const variant = result.selected;

  if (!variant || !variant.variant_vcf) {
    return null;
  }

  const vcfParts = variant.variant_vcf.split("-");
  if (vcfParts.length < 4) {
    return (
      <div className="py-8">
        <h3 className="text-2xl font-semibold text-slate-900">
          Invalid variant format: {variant.variant_vcf}
        </h3>
      </div>
    );
  }

  const [chrom, pos, refAllele, altAllele] = vcfParts;

  const handleAlleleChange = (vcf: string) => {
    if (vcf === optimisticVcf || !result.rsid) return;

    // Optimistic update for immediate feedback
    setOptimisticVcf(vcf);

    startTransition(async () => {
      try {
        await setVariantSelectionCookie(result.rsid!, vcf);
        // Hard browser reload - same as your old working implementation
        window.location.reload();
      } catch (error) {
        console.error("Failed to change allele:", error);
      }
    });
  };

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-breadcrumb mb-4">
        <span className="px-2.5 py-1 bg-slate-200 rounded-md text-label">
          {genome.toUpperCase()}
        </span>
        <span className="text-slate-300">/</span>
        <span className="text-breadcrumb-mono">
          {chrom}:{Number(pos).toLocaleString()}
        </span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-4">
            <h1 className="text-page-title">
              {isRsidSearch ? result.rsid : variant.variant_vcf}
            </h1>
            {isRsidSearch ? (
              <span className="text-lg font-mono text-slate-400">
                {variant.variant_vcf}
              </span>
            ) : (
              result.rsid && (
                <span className="text-lg font-mono text-slate-400">
                  {result.rsid}
                </span>
              )
            )}
          </div>

          {/* Alleles Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {showAlleleSelector ? (
              /* Allele selector for ambiguous rsIDs */
              <div className="flex items-center gap-2">
                <span className="text-label">
                  Allele
                </span>
                <div className="flex gap-1">
                  {result.variants.map((v) => {
                    const parts = v.variant_vcf.split("-");
                    const ref = parts[2] || "?";
                    const alt = parts[3] || "?";
                    // Use optimistic value for immediate UI feedback
                    const isSelected = v.variant_vcf === optimisticVcf;

                    return (
                      <button
                        key={v.variant_vcf}
                        type="button"
                        onClick={() => handleAlleleChange(v.variant_vcf)}
                        disabled={isPending}
                        className={cn(
                          "px-3 py-1.5 rounded-lg font-mono text-sm font-medium transition-all",
                          "border focus:outline-none focus:ring-2 focus:ring-primary/50",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        {ref}→{alt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Static ref/alt display */
              <div className="inline-flex items-center gap-2 text-sm">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-heading">
                  {refAllele}
                </span>
                <span className="text-label">
                  ref / alt
                </span>
                <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-heading">
                  {altAllele}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Share variant"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/25"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
