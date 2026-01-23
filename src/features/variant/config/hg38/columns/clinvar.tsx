import { ExternalLink } from "@/shared/components/ui/external-link";
import type { Variant } from "@/features/variant/types";
import {
  BADGE_COLORS,
  categories,
  cell,
  createColumns,
  tooltip,
} from "@/infrastructure/table/column-builder";
import {
  parseClinicalSignificancePairs,
  parseDatabaseEntries,
  parseDiseaseNames,
} from "@/infrastructure/utils/parsing-utils";

const col = createColumns<Variant>();

// ============================================================================
// Category Definitions
// ============================================================================

const clinicalSignificance = categories([
  {
    label: "Pathogenic",
    match: /pathogenic/i,
    color: "red",
    description: "variant is disease-causing",
  },
  {
    label: "Likely Pathogenic",
    match: /likely[_\s]pathogenic/i,
    color: "orange",
    description: "variant is likely disease-causing",
  },
  {
    label: "Benign",
    match: /benign/i,
    color: "green",
    description: "variant is not disease-causing",
  },
  {
    label: "Likely Benign",
    match: /likely[_\s]benign/i,
    color: "lime",
    description: "variant is likely not disease-causing",
  },
  {
    label: "Uncertain Significance",
    match: /uncertain[_\s]significance/i,
    color: "yellow",
    description: "clinical impact is unclear",
  },
  {
    label: "Conflicting",
    match: /conflicting/i,
    color: "amber",
    description: "conflicting interpretations reported",
  },
  {
    label: "Drug Response",
    match: /drug[_\s]response/i,
    color: "purple",
    description: "affects drug response",
  },
  {
    label: "Association",
    match: /association/i,
    color: "blue",
    description: "associated with phenotype",
  },
  {
    label: "Risk Factor",
    match: /risk[_\s]factor/i,
    color: "violet",
    description: "increases disease risk",
  },
  {
    label: "Protective",
    match: /protective/i,
    color: "emerald",
    description: "decreases disease risk",
  },
]);

const reviewStatus = categories([
  {
    label: "Practice Guideline",
    match: /practice[_\s]guideline/i,
    color: "emerald",
    description: "reviewed by expert panel with practice guideline",
  },
  {
    label: "Reviewed by Expert Panel",
    match: /reviewed[_\s]by[_\s]expert[_\s]panel/i,
    color: "green",
    description: "reviewed by expert panel",
  },
  {
    label: "Criteria Provided (Multiple Submitters)",
    match: /criteria[_\s]provided.*multiple[_\s]submitters/i,
    color: "lime",
    description: "multiple submitters provided criteria",
  },
  {
    label: "Criteria Provided (Single Submitter)",
    match: /criteria[_\s]provided.*single[_\s]submitter/i,
    color: "yellow",
    description: "single submitter provided criteria",
  },
  {
    label: "No Assertion Criteria Provided",
    match: /no[_\s]assertion[_\s]criteria/i,
    color: "orange",
    description: "no assertion criteria provided",
  },
  {
    label: "No Assertion Provided",
    match: /no[_\s]assertion[_\s]provided/i,
    color: "red",
    description: "no assertion provided",
  },
]);

const alleleOrigin = categories([
  {
    label: "Germline",
    match: /germline/i,
    color: "blue",
    description: "inherited from parents",
  },
  {
    label: "Somatic",
    match: /somatic/i,
    color: "rose",
    description: "acquired mutation",
  },
  {
    label: "De Novo",
    match: /de[_\s-]novo/i,
    color: "purple",
    description: "new mutation not in parents",
  },
  {
    label: "Inherited",
    match: /inherited/i,
    color: "cyan",
    description: "passed from parent",
  },
  {
    label: "Paternal",
    match: /paternal/i,
    color: "indigo",
    description: "from father",
  },
  {
    label: "Maternal",
    match: /maternal/i,
    color: "violet",
    description: "from mother",
  },
  {
    label: "Biparental",
    match: /biparental/i,
    color: "teal",
    description: "from both parents",
  },
  {
    label: "Uniparental",
    match: /uniparental/i,
    color: "lime",
    description: "from one parent only",
  },
  {
    label: "Unknown",
    match: /unknown/i,
    color: "gray",
    description: "origin unknown",
  },
  {
    label: "Not Tested",
    match: /not[_\s-]tested/i,
    color: "stone",
    description: "not tested",
  },
  {
    label: "Tested Inconclusive",
    match: /tested[_\s-]inconclusive/i,
    color: "amber",
    description: "testing was inconclusive",
  },
]);

// Numeric origin code mapping
const ORIGIN_MAP: Record<number, string> = {
  0: "unknown",
  1: "germline",
  2: "somatic",
  4: "inherited",
  8: "paternal",
  16: "maternal",
  32: "de-novo",
  64: "biparental",
  128: "uniparental",
  256: "not-tested",
  512: "tested-inconclusive",
};

// ============================================================================
// Custom Cell Renderers
// ============================================================================

function formatDiseaseName(name: string): string {
  // Replace underscores with spaces
  let formatted = name.replace(/_/g, " ");

  // Capitalize first letter of each word
  formatted = formatted
    .split(" ")
    .map(word => {
      // Keep special cases lowercase
      if (["of", "the", "a", "an", "and", "or", "to", "in", "for", "due"].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  // Always capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  return formatted;
}

function DiseaseList({
  value,
}: {
  value: Array<string | null> | string | null | undefined;
}) {
  const diseases = (
    Array.isArray(value) ? value.filter(Boolean) : parseDiseaseNames(value ?? null)
  ).filter((d): d is string => d !== null);
  if (diseases.length === 0) return <span>-</span>;

  const formattedDiseases = diseases.map(d => formatDiseaseName(d));

  if (formattedDiseases.length === 1) return <span>{formattedDiseases[0]}</span>;

  return (
    <div className="space-y-0.5">
      {formattedDiseases.map((disease, i) => (
        <div key={i}>{disease}</div>
      ))}
    </div>
  );
}

function ClinicalSignificancePairs({
  value,
}: {
  value:
    | Array<{ classification?: string | null; variation_id?: string | null }>
    | string
    | null
    | undefined;
}) {
  const pairs = Array.isArray(value)
    ? value
        .filter((entry) => entry?.classification || entry?.variation_id)
        .map((entry) => ({
          id: entry?.variation_id || "",
          significance: entry?.classification || "",
          raw: `${entry?.variation_id || ""}:${entry?.classification || ""}`,
        }))
    : parseClinicalSignificancePairs(value ?? null);

  return (
    <div className="space-y-1">
      {pairs.map(({ id, significance, raw }, i) => {
        if (!significance) return <div key={i}>{raw.replace(/_/g, " ")}</div>;

        const color = clinicalSignificance.getColor(significance);
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono">{id}:</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[color]}`}
            >
              {significance.replace(/_/g, " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DatabaseEntries({
  value,
}: {
  value:
    | Array<{ db?: string | null; id?: string | null }>
    | string
    | null
    | undefined;
}) {
  const entries = Array.isArray(value)
    ? value
        .filter((entry) => entry?.db && entry?.id)
        .map((entry) => ({
          database: entry?.db || "",
          id: entry?.id || "",
          raw: `${entry?.db || ""}:${entry?.id || ""}`,
        }))
    : parseDatabaseEntries(value ?? null);

  return (
    <div className="space-y-0.5">
      {entries.map(({ database, id, raw }, i) => {
        if (!id)
          return (
            <div key={i} className="font-mono">
              {raw}
            </div>
          );
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium">
              {database}:
            </span>
            <span className="font-mono text-foreground">{id}</span>
          </div>
        );
      })}
    </div>
  );
}

function decodeOriginFlags(value: number): string[] {
  const origins: string[] = [];
  // Check each bit flag from highest to lowest
  const flags = [512, 256, 128, 64, 32, 16, 8, 4, 2, 1];
  let remaining = value;

  for (const flag of flags) {
    if (remaining >= flag && flag in ORIGIN_MAP) {
      origins.push(ORIGIN_MAP[flag]);
      remaining -= flag;
    }
  }

  // If no flags matched or value is 0, return unknown
  if (origins.length === 0) {
    origins.push(ORIGIN_MAP[0] || "unknown");
  }

  return origins;
}

function OriginBadge({ value }: { value: string | number }) {
  if (!value && value !== 0) return <span>-</span>;

  // Try to decode numeric value (handles both number and string number)
  const numericValue =
    typeof value === "number" ? value : parseInt(String(value), 10);

  // If it's a valid number, decode the bitwise flags
  if (!Number.isNaN(numericValue)) {
    const origins = decodeOriginFlags(numericValue);

    return (
      <div className="flex flex-wrap gap-1">
        {origins.map((origin, i) => {
          const color = alleleOrigin.getColor(origin);
          return (
            <span
              key={i}
              className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium capitalize ${BADGE_COLORS[color]}`}
            >
              {origin.replace(/[_-]/g, " ")}
            </span>
          );
        })}
      </div>
    );
  }

  // If it's already a string label, display as-is
  const text = String(value);
  const color = alleleOrigin.getColor(text);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full font-medium capitalize ${BADGE_COLORS[color]}`}
    >
      {text.replace(/[_-]/g, " ")}
    </span>
  );
}

// ============================================================================
// Column Definitions
// ============================================================================

export const clinvarColumns = [
  col.accessor("clnsig", {
    accessor: (row) => row.clinvar?.clnsig?.[0] ?? null,
    header: "Clinical Significance",
    description: tooltip({
      title: "Clinical Significance",
      description: "Clinical significance for this single variant.",
      citation: "Landrum et al., 2017, 2013",
      categories: clinicalSignificance,
    }),
    cell: cell.badge(clinicalSignificance),
  }),

  col.accessor("clnsigincl", {
    accessor: (row) => row.clinvar?.clnsigincl,
    header: "Clinical Significance (Genotype)",
    description: tooltip({
      title: "Clinical Significance (Genotype Includes)",
      description:
        "Clinical significance for a haplotype or genotype that includes this variant. Reported as pairs of VariationID:clinical significance.",
      citation: "Landrum et al., 2017, 2013",
      categories: clinicalSignificance,
    }),
    cell: cell.custom(
      (
        val:
          | Array<{ classification?: string | null; variation_id?: string | null }>
          | string
          | null,
      ) => <ClinicalSignificancePairs value={val} />,
    ),
  }),

  col.accessor("clndn", {
    accessor: (row) => row.clinvar?.clndn,
    header: "Disease Name",
    description: tooltip({
      title: "Disease Name",
      description:
        "ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB.",
      citation: "Landrum et al., 2017, 2013",
    }),
    cell: cell.custom(
      (val: Array<string | null> | string | null) => (
        <DiseaseList value={val} />
      ),
    ),
  }),

  col.accessor("clndnincl", {
    accessor: (row) => row.clinvar?.clndnincl,
    header: "Disease Name (Variant Includes)",
    description: tooltip({
      title: "Disease Name (Variant Includes)",
      description:
        "For included variant: ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB.",
      citation: "Landrum et al., 2017, 2013",
    }),
    cell: cell.custom(
      (val: Array<string | null> | string | null) => (
        <DiseaseList value={val} />
      ),
    ),
  }),

  col.accessor("clnrevstat", {
    accessor: (row) => row.clinvar?.clnrevstat,
    header: "Review Status",
    description: tooltip({
      title: "Review Status",
      description: "ClinVar review status for the Variation ID.",
      citation: "Landrum et al., 2017, 2013",
      categories: reviewStatus,
    }),
    cell: cell.badge(reviewStatus),
  }),

  col.accessor("origin", {
    accessor: (row) => row.clinvar?.origin,
    header: "Allele Origin",
    description: tooltip({
      title: "Allele Origin",
      description:
        "Allele origin indicating whether the variant is inherited, acquired, or of unknown origin.",
      citation: "Landrum et al., 2017, 2013",
      categories: alleleOrigin,
    }),
    cell: cell.custom((val: string | number) => <OriginBadge value={val} />),
  }),

  // col.accessor("clndisdb", {
  //   accessor: (row) => row.clinvar?.clndisdb,
  //   header: "Disease Database ID",
  //   description: tooltip({
  //     title: "Disease Database ID",
  //     description:
  //       "Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN.",
  //     citation: "Landrum et al., 2017, 2013",
  //   }),
  //   cell: cell.custom(
  //     (
  //       val:
  //         | Array<{ db?: string | null; id?: string | null }>
  //         | string
  //         | null,
  //     ) => <DatabaseEntries value={val} />,
  //   ),
  // }),

  // col.accessor("clndisdbincl", {
  //   accessor: (row) => row.clinvar?.clndisdbincl,
  //   header: "Disease Database ID (Included Variant)",
  //   description: tooltip({
  //     title: "Disease Database ID (Included Variant)",
  //     description:
  //       "For included variant: Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN.",
  //     citation: "Landrum et al., 2017, 2013",
  //   }),
  //   cell: cell.custom(
  //     (
  //       val:
  //         | Array<{ db?: string | null; id?: string | null }>
  //         | string
  //         | null,
  //     ) => <DatabaseEntries value={val} />,
  //   ),
  // }),

  // col.accessor("geneinfo", {
  //   accessor: (row) => row.clinvar?.geneinfo,
  //   header: "Gene Reported",
  //   description: tooltip({
  //     title: "Gene Reported",
  //     description:
  //       "Gene(s) for the variant reported as gene symbol:gene id. The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|).",
  //     citation: "Landrum et al., 2017, 2013",
  //   }),
  //   cell: cell.custom(
  //     (
  //       val: Array<{ symbol?: string | null; id?: string | null }> | null,
  //     ) => {
  //       const genes = (val ?? []).filter((gene) => gene?.symbol && gene?.id);
  //       if (genes.length === 0) return <span>-</span>;

  //       return (
  //         <div className="flex flex-wrap gap-2">
  //           {genes.map((gene, i) => (
  //             <ExternalLink
  //               key={i}
  //               href={`https://www.ncbi.nlm.nih.gov/gene/${gene?.id}`}
  //               className="font-medium"
  //             >
  //               {gene?.symbol}
  //             </ExternalLink>
  //           ))}
  //         </div>
  //       );
  //     },
  //   ),
  // }),
];

export const clinvarGroup = col.group("clinvar", "ClinVar", clinvarColumns);
