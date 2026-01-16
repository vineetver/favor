import { Download, Share2 } from "lucide-react";

import type { Variant } from "@/features/variant/types";
import { cn } from "@/lib/utils";

interface VariantHeaderProps {
  variant: Variant;
  genome?: "hg38" | "hg19";
}

export function VariantHeader({ variant, genome = "hg38" }: VariantHeaderProps) {
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

  // Extract gene name from geneinfo (format: "GENE:ID" or just "GENE")
  const geneName = variant.geneinfo?.split(":")?.[0] || null;

  // Get variant type from exonic category
  const variantType = formatVariantType(variant.genecode_comprehensive_exonic_category);

  // Get clinical significance
  const clinicalSig = parseClinicalSignificance(variant.clnsig);

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="px-2.5 py-1 bg-slate-200 rounded-md font-bold text-slate-700 uppercase tracking-wide text-xs">
          {genome.toUpperCase()}
        </span>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-slate-500">
          {chrom}:{Number(pos).toLocaleString()}
        </span>
        {geneName && (
          <>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700">{geneName}</span>
          </>
        )}
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {variant.rsid || variant.variant_vcf}
            </h1>
            {variant.rsid && (
              <span className="text-lg font-mono text-slate-400">
                {variant.variant_vcf}
              </span>
            )}
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Allele Badges */}
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-slate-900">
                {refAllele}
              </span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                ref / alt
              </span>
              <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg font-bold text-slate-900">
                {altAllele}
              </span>
            </div>

            {/* Variant Type Badge */}
            {variantType && (
              <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {variantType}
              </span>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Clinical Significance Badge */}
          {clinicalSig && (
            <span
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider",
                clinicalSig.className
              )}
            >
              {clinicalSig.label}
            </span>
          )}

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

  // Convert snake_case or similar to Title Case
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ClinicalSigResult {
  label: string;
  className: string;
}

// Clinical significance mapping (Commandment V: flat control flow)
const CLINICAL_SIGNIFICANCE_MAP: Record<string, ClinicalSigResult> = {
  pathogenic: { label: "Pathogenic", className: "bg-red-100 text-red-700" },
  "likely_pathogenic": { label: "Likely Pathogenic", className: "bg-orange-100 text-orange-700" },
  benign: { label: "Benign", className: "bg-green-100 text-green-700" },
  "likely_benign": { label: "Likely Benign", className: "bg-emerald-100 text-emerald-700" },
  uncertain_significance: { label: "VUS", className: "bg-amber-100 text-amber-700" },
  conflicting: { label: "Conflicting", className: "bg-purple-100 text-purple-700" },
};

function parseClinicalSignificance(clnsig: string | null | undefined): ClinicalSigResult | null {
  if (!clnsig || clnsig === "." || clnsig === "not_provided") return null;

  const sig = clnsig.toLowerCase();

  // Check for likely pathogenic first (more specific)
  if (sig.includes("likely") && sig.includes("pathogenic")) {
    return CLINICAL_SIGNIFICANCE_MAP["likely_pathogenic"];
  }
  if (sig.includes("pathogenic") && !sig.includes("benign")) {
    return CLINICAL_SIGNIFICANCE_MAP["pathogenic"];
  }

  // Check for likely benign first (more specific)
  if (sig.includes("likely") && sig.includes("benign")) {
    return CLINICAL_SIGNIFICANCE_MAP["likely_benign"];
  }
  if (sig.includes("benign")) {
    return CLINICAL_SIGNIFICANCE_MAP["benign"];
  }

  if (sig.includes("uncertain") || sig.includes("vus")) {
    return CLINICAL_SIGNIFICANCE_MAP["uncertain_significance"];
  }

  if (sig.includes("conflicting")) {
    return CLINICAL_SIGNIFICANCE_MAP["conflicting"];
  }

  return { label: clnsig.replace(/_/g, " "), className: "bg-slate-100 text-slate-600" };
}
