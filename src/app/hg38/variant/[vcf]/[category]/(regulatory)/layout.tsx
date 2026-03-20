import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchRegionSummary } from "@features/enrichment/api/region";
import { RegionNavBar } from "@features/enrichment/components/region-nav-bar";
import type { NavGroup } from "@features/enrichment/components/region-nav-bar";
import { notFound } from "next/navigation";

// ---------------------------------------------------------------------------
// Variant-specific nav groups
// ---------------------------------------------------------------------------

const VARIANT_NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      {
        key: null,
        slug: "overview",
        label: "Overview",
        hint: "Tissue evidence ranked by convergence across all data types",
      },
    ],
  },
  {
    label: "Region Context",
    items: [
      {
        key: "signals",
        slug: "tissue-signals",
        label: "cCRE Activity",
        hint: "cCRE epigenomic signal Z-scores across tissues",
      },
      {
        key: "chromatin_states",
        slug: "chromatin-states",
        label: "Chromatin",
        hint: "Roadmap 25-state chromatin annotations",
      },
      {
        key: "accessibility_peaks",
        slug: "accessibility",
        label: "Peaks",
        hint: "ATAC-seq / DNase accessibility peaks",
      },
      {
        key: "enhancer_genes",
        alsoCount: ["epiraction", "epimap", "encode_re2g"],
        slug: "enhancer-genes",
        label: "Enhancers",
        hint: "Enhancer-gene predictions (ABC, EPIraction, EpiMap, RE2G)",
      },
      {
        key: "loops",
        slug: "loops",
        label: "Loops",
        hint: "Chromatin loops from Hi-C / ChIA-PET",
      },
      {
        key: "ase",
        slug: "allele-specific",
        label: "ASE",
        hint: "Allele-specific epigenomic activity at cCREs",
      },
      {
        key: "validated_enhancers",
        slug: "validated-enhancers",
        label: "VISTA",
        hint: "In vivo validated enhancers from VISTA",
      },
      {
        key: null,
        slug: "ccre-links",
        label: "cCRE Links",
        hint: "Gene linkages for the cCRE overlapping this variant (ChIA-PET, ENCODE SCREEN)",
      },
    ],
  },
  {
    label: "Variant Effects",
    items: [
      {
        key: "qtls",
        slug: "qtls",
        label: "QTLs",
        hint: "eQTL/sQTL associations (GTEx, eQTL Catalogue, single-cell)",
      },
      {
        key: "chrombpnet",
        slug: "chrombpnet",
        label: "ChromBPNet",
        hint: "Deep learning predictions of variant effects on chromatin accessibility",
      },
      {
        key: "tissue_scores",
        slug: "tissue-scores",
        label: "V2F Scores",
        hint: "Tissue-specific variant functional scores: TLand and cV2F",
      },
      {
        key: "allelic_imbalance",
        slug: "allelic-imbalance",
        label: "Histone Imbal.",
        hint: "ENTEx histone allelic imbalance at this variant",
      },
      {
        key: "methylation",
        slug: "methylation",
        label: "Methylation",
        hint: "Allele-specific DNA methylation differences",
      },
    ],
  },
  {
    label: "AI Predictions",
    items: [
      {
        key: null,
        slug: "alphagenome",
        label: "AlphaGenome",
        hint: "Deep learning variant impact scores and ref vs alt track predictions",
        hot: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface RegulatoryLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function RegulatoryLayout({
  children,
  params,
}: RegulatoryLayoutProps) {
  const { vcf, category } = await params;

  if (category !== "regulatory") {
    notFound();
  }

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;

  const summary = await fetchRegionSummary(loc).catch(() => null);

  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  return (
    <div>
      {summary && (
        <div className="hidden lg:block">
          <RegionNavBar
            summary={summary}
            basePath={basePath}
            navGroups={VARIANT_NAV_GROUPS}
          />
        </div>
      )}
      {children}
    </div>
  );
}
