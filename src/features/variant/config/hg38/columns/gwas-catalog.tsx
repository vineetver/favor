import type { GwasAssociationRow } from "@features/variant/types/gwas";
import {
  Badge,
  categories,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";
import { ExternalLink } from "@shared/components/ui/external-link";

const col = createColumns<GwasAssociationRow>();

// Variant context categories
const variantContextCategories = categories([
  {
    label: "Missense",
    match: "missense_variant",
    color: "amber",
    description: "Variant causes amino acid change in protein",
  },
  {
    label: "Synonymous",
    match: "synonymous_variant",
    color: "gray",
    description: "Variant does not change amino acid",
  },
  {
    label: "Intron",
    match: "intron_variant",
    color: "blue",
    description: "Variant located in intron",
  },
  {
    label: "Intergenic",
    match: "intergenic_variant",
    color: "stone",
    description: "Variant located between genes",
  },
  {
    label: "Regulatory",
    match: /regulatory_region/,
    color: "violet",
    description: "Variant affects regulatory region",
  },
  {
    label: "UTR",
    match: /utr_variant/,
    color: "cyan",
    description: "Variant in untranslated region",
  },
]);

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUPERSCRIPT_DIGITS[c] || c)
    .join("");
}

function formatPValue(pval: number | null): string {
  if (pval === null || pval === undefined) return "-";
  if (pval === 0) return "0";
  if (pval >= 0.01) return pval.toFixed(4);
  // For small p-values, use mantissa × 10^exp format
  const exp = Math.floor(Math.log10(Math.abs(pval)));
  const mantissa = pval / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}×10${toSuperscript(exp)}`;
}

function formatMlogP(mlog: number | null): string {
  if (mlog === null) return "-";
  return mlog.toFixed(2);
}

export const gwasCatalogColumns = [
  col.display("diseaseTrait", {
    header: "Disease/Trait",
    description: tooltip({
      title: "Disease/Trait",
      description:
        "The disease or trait associated with this variant from the GWAS Catalog.",
      citation: "NHGRI-EBI GWAS Catalog",
    }),
    cell: ({ row }) => {
      const val = row.original.diseaseTrait || row.original.trait;
      if (!val) return "-";
      return val.length > 50 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 50)}...
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  col.display("mappedGene", {
    header: "Gene",
    description: tooltip({
      title: "Mapped Gene",
      description:
        "Gene symbol mapped to this variant based on genomic location.",
    }),
    cell: ({ row }) => {
      const gene = row.original.mappedGene;
      if (!gene) return "-";
      return (
        <span className="font-medium text-primary">{gene}</span>
      );
    },
  }),

  col.display("pvalueMlog", {
    header: "−log₁₀(p)",
    description: tooltip({
      title: "-log10(P-value)",
      description:
        "Negative log10 of the p-value. Higher values indicate stronger association.",
      guides: [
        { threshold: "> 8", meaning: "Genome-wide significant (p < 5e-8)" },
        { threshold: "5-8", meaning: "Suggestive significance" },
        { threshold: "< 5", meaning: "Below typical GWAS threshold" },
      ],
    }),
    cell: ({ row }) => {
      const mlog = row.original.pvalueMlog;
      if (mlog === null) return "-";
      const color = mlog > 8 ? "emerald" : mlog > 5 ? "amber" : "gray";
      return <Badge color={color}>{formatMlogP(mlog)}</Badge>;
    },
  }),

  col.display("pvalue", {
    header: "P-value",
    description: tooltip({
      title: "P-value",
      description: "Statistical significance of the association.",
    }),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatPValue(row.original.pvalue)}
      </span>
    ),
  }),

  col.display("riskAllele", {
    header: "Risk Allele",
    description: tooltip({
      title: "Risk Allele",
      description:
        "The allele associated with increased risk or trait value.",
    }),
    cell: ({ row }) => {
      const val = row.original.riskAllele;
      if (!val) return "-";
      // Extract just the allele if in format "rs123-A"
      const allele = val.includes("-") ? val.split("-").pop() : val;
      return (
        <span className="font-mono font-medium text-rose-600">{allele}</span>
      );
    },
  }),

  col.display("effectSize", {
    header: "OR/Beta",
    description: tooltip({
      title: "Effect Size (OR or Beta)",
      description:
        "Odds ratio for binary traits or beta coefficient for quantitative traits.",
    }),
    cell: ({ row }) => {
      const val = row.original.effectSize;
      if (!val) return "-";
      return <span className="font-mono text-sm">{val}</span>;
    },
  }),

  col.display("confidenceInterval", {
    header: "95% CI",
    description: tooltip({
      title: "95% Confidence Interval",
      description: "95% confidence interval for the effect size estimate.",
    }),
    cell: ({ row }) => {
      const val = row.original.confidenceInterval;
      if (!val) return "-";
      return <span className="font-mono text-sm text-muted-foreground">{val}</span>;
    },
  }),

  col.display("riskAlleleFrequency", {
    header: "RAF",
    description: tooltip({
      title: "Risk Allele Frequency",
      description: "Population frequency of the risk allele.",
    }),
    cell: ({ row }) => {
      const val = row.original.riskAlleleFrequency;
      if (!val) return "-";
      const freq = parseFloat(val);
      if (Number.isNaN(freq)) return val;
      return <span className="font-mono text-sm">{freq.toFixed(4)}</span>;
    },
  }),

  col.display("variantContext", {
    header: "Context",
    description: tooltip({
      title: "Variant Context",
      description: "Functional consequence of the variant.",
      categories: variantContextCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.variantContext;
      if (!val) return "-";
      const color = variantContextCategories.getColor(val);
      const label = val.replace(/_/g, " ").replace(/variant/gi, "").trim();
      return <Badge color={color}>{label}</Badge>;
    },
  }),

  col.display("firstAuthor", {
    header: "First Author",
    description: tooltip({
      title: "First Author",
      description: "First author of the GWAS study.",
    }),
    cell: ({ row }) => {
      const val = row.original.firstAuthor;
      if (!val) return "-";
      // Truncate long author names
      const name = val.length > 20 ? `${val.slice(0, 20)}...` : val;
      return <span title={val}>{name}</span>;
    },
  }),

  col.display("pubmedId", {
    header: "PubMed",
    description: tooltip({
      title: "PubMed ID",
      description: "Link to the original publication in PubMed.",
    }),
    cell: ({ row }) => {
      const pmid = row.original.pubmedId;
      if (!pmid) return "-";
      return (
        <ExternalLink
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
          className="font-mono text-sm"
        >
          {pmid}
        </ExternalLink>
      );
    },
  }),

  col.display("studyAccession", {
    header: "Study",
    description: tooltip({
      title: "GWAS Catalog Study Accession",
      description: "Link to the study page in GWAS Catalog.",
      citation: "NHGRI-EBI GWAS Catalog",
    }),
    cell: ({ row }) => {
      const accession = row.original.studyAccession;
      if (!accession) return "-";
      return (
        <ExternalLink
          href={`https://www.ebi.ac.uk/gwas/studies/${accession}`}
          className="font-mono text-sm"
        >
          {accession}
        </ExternalLink>
      );
    },
  }),

  col.display("rsid", {
    header: "rsID",
    description: tooltip({
      title: "dbSNP rsID",
      description: "Reference SNP identifier from dbSNP.",
    }),
    cell: ({ row }) => {
      const rsid = row.original.rsid;
      if (!rsid) return "-";
      return (
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/snp/${rsid}`}
          className="font-mono text-sm"
        >
          {rsid}
        </ExternalLink>
      );
    },
  }),

  col.display("region", {
    header: "Region",
    description: tooltip({
      title: "Cytogenetic Region",
      description: "Cytogenetic band location of the variant.",
    }),
    cell: ({ row }) => {
      const val = row.original.region;
      if (!val) return "-";
      return <span className="font-mono text-sm text-muted-foreground">{val}</span>;
    },
  }),
];
