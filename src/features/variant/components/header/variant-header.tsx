"use client";

import type { VariantFetchResult } from "@features/variant/api";
import { setVariantSelectionCookie } from "@features/variant/actions/variant-selection";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Download, MapPin, Share2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";

function formatDistance(value: number | null | undefined): string | null {
  if (value == null) return null;
  return value.toLocaleString() + " bp";
}

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
        <h3 className="text-2xl font-semibold text-foreground">
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
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {genome.toUpperCase()}
        </span>
        <span className="text-border">·</span>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Variant
        </span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-3">
            <h1 className="text-page-title">
              {isRsidSearch ? result.rsid : variant.variant_vcf}
            </h1>
            {isRsidSearch ? (
              <span className="text-lg font-mono text-muted-foreground">
                {variant.variant_vcf}
              </span>
            ) : (
              result.rsid && (
                <span className="text-lg font-mono text-muted-foreground">
                  {result.rsid}
                </span>
              )
            )}
          </div>

          {/* Alleles & Proximity Row */}
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
                            ? "bg-foreground text-background border-foreground"
                            : "bg-background text-foreground border-border hover:border-primary/30 hover:bg-muted",
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
                <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg font-bold text-heading">
                  {refAllele}
                </span>
                <span className="text-label">
                  ref / alt
                </span>
                <span className="w-8 h-8 flex items-center justify-center bg-muted rounded-lg font-bold text-heading">
                  {altAllele}
                </span>
              </div>
            )}

            {/* Proximity distances */}
            {(variant.main?.distance?.min_dist_tss != null ||
              variant.main?.distance?.min_dist_tse != null) && (
              <>
                <span className="hidden sm:block w-px h-5 bg-border" />
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {formatDistance(variant.main?.distance?.min_dist_tss) && (
                    <span>
                      <span className="text-label">TSS</span>{" "}
                      {formatDistance(variant.main.distance.min_dist_tss)}
                    </span>
                  )}
                  {formatDistance(variant.main?.distance?.min_dist_tse) && (
                    <span>
                      <span className="text-label">TSE</span>{" "}
                      {formatDistance(variant.main.distance.min_dist_tse)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" aria-label="Share variant">
            <Share2 className="w-5 h-5" />
          </Button>

          <Button variant="outline">
            <Download />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
}
