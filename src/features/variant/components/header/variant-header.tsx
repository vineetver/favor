import type { Variant } from "@features/variant/types";
import { cn } from "@infra/utils";
import { Download, Share2 } from "lucide-react";

interface VariantHeaderProps {
  variant: Variant;
  genome?: "hg38" | "hg19";
}

export function VariantHeader({
  variant,
  genome = "hg38",
}: VariantHeaderProps) {
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

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="px-2.5 py-1 bg-slate-200 rounded-md font-bold text-slate-700 uppercase tracking-widest text-xs">
          {genome.toUpperCase()}
        </span>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-slate-500">
          {chrom}:{Number(pos).toLocaleString()}
        </span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {variant.dbsnp?.rsid || variant.variant_vcf}
            </h1>
            {variant.dbsnp?.rsid && (
              <span className="text-lg font-mono text-slate-400">
                {variant.variant_vcf}
              </span>
            )}
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-slate-900">
                {refAllele}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                ref / alt
              </span>
              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-slate-900">
                {altAllele}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Action Buttons */}
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

function formatVariantType(category: string | null | undefined): string | null {
  if (!category || category === "." || category === "unknown") return null;

  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
