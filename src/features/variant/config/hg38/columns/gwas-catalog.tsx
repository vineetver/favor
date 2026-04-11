import type { GwasAssociationRow } from "@features/variant/types/gwas";
import { createColumns, tooltip } from "@infra/table/column-builder";
import { ExternalLink } from "@shared/components/ui/external-link";

const col = createColumns<GwasAssociationRow>();

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

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
  const exp = Math.floor(Math.log10(Math.abs(pval)));
  const mantissa = pval / 10 ** exp;
  return `${mantissa.toFixed(2)}×10${toSuperscript(exp)}`;
}

/** Significance stars for p-value — standard genomics convention */
function sigStars(pval: number | null): string {
  if (pval === null || pval === undefined) return "";
  if (pval < 5e-8) return "***"; // genome-wide
  if (pval < 1e-5) return "**"; // suggestive
  if (pval < 0.05) return "*"; // nominal
  return "";
}

/** Extract short form of first author name (e.g. "Smith AB" or "Smith") */
function formatAuthor(author: string | null): string {
  if (!author) return "-";
  return author.length > 18 ? `${author.slice(0, 18)}…` : author;
}

/**
 * Parse the leading numeric value from a GWAS Catalog effect_size string.
 * GWAS Catalog stores OR and beta in a single free-text field, often with
 * trailing units like "12.300 unit increase". We only care about the number
 * for directional and magnitude encoding.
 */
function parseEffect(val: string): { num: number; sign: 1 | -1 | 0 } | null {
  const m = val.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/);
  if (!m) return null;
  const num = Number(m[0]);
  if (!Number.isFinite(num)) return null;
  const sign = num > 0 ? 1 : num < 0 ? -1 : 0;
  return { num, sign };
}

// ---------------------------------------------------------------------------
// Columns — ordered by actionability (strongest signals first)
// ---------------------------------------------------------------------------

export const gwasCatalogColumns = [
  // 1. Risk allele — what to look for
  col.display("riskAllele", {
    header: "Risk Allele",
    description: tooltip({
      title: "Risk Allele",
      description: "The allele associated with increased risk or trait value.",
    }),
    cell: ({ row }) => {
      const val = row.original.riskAllele;
      if (!val) return "-";
      return <span className="font-mono font-medium text-rose-600">{val}</span>;
    },
  }),

  // 2. Mapped gene — what it hits
  col.display("mappedGene", {
    header: "Mapped Gene",
    description: tooltip({
      title: "Mapped Gene",
      description:
        "Gene symbol mapped to this variant based on genomic location.",
    }),
    cell: ({ row }) => {
      const gene = row.original.mappedGene;
      if (!gene) return "-";
      return <span className="font-medium text-primary">{gene}</span>;
    },
  }),

  // 3. Risk allele frequency — how common
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
      return (
        <span className="font-mono text-sm tabular-nums">
          {freq.toFixed(3)}
        </span>
      );
    },
  }),

  // 4. Effect size — how strong, with direction arrow
  col.display("effectSize", {
    header: "OR/Beta",
    description: tooltip({
      title: "Effect Size (OR or Beta)",
      description:
        "Odds ratio (binary traits) or beta coefficient (quantitative traits). ▲ = positive association, ▼ = negative. Rose highlight marks strong effects (|value| ≥ 1).",
    }),
    cell: ({ row }) => {
      const val = row.original.effectSize;
      if (!val) return "-";
      const parsed = parseEffect(val);
      if (!parsed) {
        return <span className="font-mono text-sm tabular-nums">{val}</span>;
      }
      const { num, sign } = parsed;
      const strong = Math.abs(num) >= 1;
      const colorClass = strong ? "text-rose-600" : "text-muted-foreground";
      const arrow = sign > 0 ? "▲" : sign < 0 ? "▼" : "→";
      return (
        <span className={`font-mono text-sm tabular-nums ${colorClass}`}>
          {Math.abs(num).toFixed(3)}
          <span className="ml-1 text-[10px]">{arrow}</span>
        </span>
      );
    },
  }),

  // 5. P-value — is it real
  col.display("pvalue", {
    header: "P-value",
    description: tooltip({
      title: "P-value",
      description:
        "Statistical significance of the association. *** p<5e−8 (genome-wide), ** p<1e−5, * p<0.05.",
    }),
    cell: ({ row }) => {
      const pval = row.original.pvalue;
      if (pval === null) return "-";
      const stars = sigStars(pval);
      return (
        <span className="font-mono text-sm tabular-nums">
          {formatPValue(pval)}
          {stars && (
            <span
              className="text-rose-500 ml-0.5"
              title="Genome-wide significant"
            >
              {stars}
            </span>
          )}
        </span>
      );
    },
  }),

  // 6. Confidence interval — uncertainty around effect
  col.display("confidenceInterval", {
    header: "95% CI",
    description: tooltip({
      title: "95% Confidence Interval",
      description: "95% confidence interval for the effect size estimate.",
    }),
    cell: ({ row }) => {
      const val = row.original.confidenceInterval;
      if (!val) return "-";
      return (
        <span className="font-mono text-xs text-muted-foreground">{val}</span>
      );
    },
  }),

  // 7. Reported trait — what the study measured
  col.display("diseaseTrait", {
    header: "Reported Trait",
    description: tooltip({
      title: "Reported Trait",
      description:
        "The disease or trait as reported by the original GWAS study.",
      citation: "NHGRI-EBI GWAS Catalog",
    }),
    cell: ({ row }) => {
      const val = row.original.trait || row.original.diseaseTrait;
      if (!val) return "-";
      return val.length > 48 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 48)}…
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  // 8. Study first author — who reported it
  col.display("firstAuthor", {
    header: "Study",
    description: tooltip({
      title: "Study First Author",
      description:
        "First author of the GWAS study that reported this association.",
    }),
    cell: ({ row }) => {
      const val = row.original.firstAuthor;
      if (!val) return "-";
      return (
        <span className="text-sm text-muted-foreground" title={val}>
          {formatAuthor(val)}
        </span>
      );
    },
  }),

  // 9. Publication — where to read more
  col.display("pubmedId", {
    header: "Publication",
    description: tooltip({
      title: "PubMed Publication",
      description: "Link to the original publication in PubMed.",
    }),
    cell: ({ row }) => {
      const pmid = row.original.pubmedId;
      if (!pmid) return "-";
      return (
        <ExternalLink
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
          className="font-mono text-xs"
        >
          PMID:{pmid}
        </ExternalLink>
      );
    },
  }),
];
