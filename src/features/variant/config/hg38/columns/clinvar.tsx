import { ExternalLink } from "@/components/ui/external-link";
import { createColumnHelper } from "@/lib/data-display/builder";
import {
  renderCategoryDescription,
  getBadgeColorMap,
  type CategoryItem,
} from "@/lib/data-display/category-helper";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

// Category definitions
const CLINICAL_SIGNIFICANCE_CATEGORIES: CategoryItem[] = [
  {
    label: "Pathogenic",
    pattern: /pathogenic/i,
    color: "red",
    description: "variant is disease-causing",
  },
  {
    label: "Likely Pathogenic",
    pattern: /likely[_\s]pathogenic/i,
    color: "orange",
    description: "variant is likely disease-causing",
  },
  {
    label: "Benign",
    pattern: /benign/i,
    color: "green",
    description: "variant is not disease-causing",
  },
  {
    label: "Likely Benign",
    pattern: /likely[_\s]benign/i,
    color: "lime",
    description: "variant is likely not disease-causing",
  },
  {
    label: "Uncertain Significance",
    pattern: /uncertain[_\s]significance/i,
    color: "yellow",
    description: "clinical impact is unclear",
  },
  {
    label: "Conflicting",
    pattern: /conflicting/i,
    color: "amber",
    description: "conflicting interpretations reported",
  },
  {
    label: "Drug Response",
    pattern: /drug[_\s]response/i,
    color: "purple",
    description: "affects drug response",
  },
  {
    label: "Association",
    pattern: /association/i,
    color: "blue",
    description: "associated with phenotype",
  },
  {
    label: "Risk Factor",
    pattern: /risk[_\s]factor/i,
    color: "violet",
    description: "increases disease risk",
  },
  {
    label: "Protective",
    pattern: /protective/i,
    color: "emerald",
    description: "decreases disease risk",
  },
];

const REVIEW_STATUS_CATEGORIES: CategoryItem[] = [
  {
    label: "Practice Guideline",
    pattern: /practice[_\s]guideline/i,
    color: "emerald",
    description: "reviewed by expert panel with practice guideline",
  },
  {
    label: "Reviewed by Expert Panel",
    pattern: /reviewed[_\s]by[_\s]expert[_\s]panel/i,
    color: "green",
    description: "reviewed by expert panel",
  },
  {
    label: "Criteria Provided (Multiple Submitters)",
    pattern: /criteria[_\s]provided.*multiple[_\s]submitters/i,
    color: "lime",
    description: "multiple submitters provided criteria",
  },
  {
    label: "Criteria Provided (Single Submitter)",
    pattern: /criteria[_\s]provided.*single[_\s]submitter/i,
    color: "yellow",
    description: "single submitter provided criteria",
  },
  {
    label: "No Assertion Criteria Provided",
    pattern: /no[_\s]assertion[_\s]criteria/i,
    color: "orange",
    description: "no assertion criteria provided",
  },
  {
    label: "No Assertion Provided",
    pattern: /no[_\s]assertion[_\s]provided/i,
    color: "red",
    description: "no assertion provided",
  },
];

const ALLELE_ORIGIN_CATEGORIES: CategoryItem[] = [
  {
    label: "Germline",
    pattern: /germline/i,
    color: "blue",
    description: "inherited from parents",
  },
  {
    label: "Somatic",
    pattern: /somatic/i,
    color: "rose",
    description: "acquired mutation",
  },
  {
    label: "De Novo",
    pattern: /de[_\s-]novo/i,
    color: "purple",
    description: "new mutation not in parents",
  },
  {
    label: "Inherited",
    pattern: /inherited/i,
    color: "cyan",
    description: "passed from parent",
  },
  {
    label: "Paternal",
    pattern: /paternal/i,
    color: "indigo",
    description: "from father",
  },
  {
    label: "Maternal",
    pattern: /maternal/i,
    color: "violet",
    description: "from mother",
  },
  {
    label: "Biparental",
    pattern: /biparental/i,
    color: "teal",
    description: "from both parents",
  },
  {
    label: "Uniparental",
    pattern: /uniparental/i,
    color: "lime",
    description: "from one parent only",
  },
  {
    label: "Unknown",
    pattern: /unknown/i,
    color: "gray",
    description: "origin unknown",
  },
  {
    label: "Not Tested",
    pattern: /not[_\s-]tested/i,
    color: "stone",
    description: "not tested",
  },
  {
    label: "Tested Inconclusive",
    pattern: /tested[_\s-]inconclusive/i,
    color: "amber",
    description: "testing was inconclusive",
  },
];

export const clinvarConfig = helper.group("clinvar", "Clinvar", [
  helper.accessor("clnsig", {
    header: "Clinical Significance",
    description: renderCategoryDescription(
      <p>
        Clinical significance for this single variant. (Landrum et al., 2017,
        2013)
      </p>,
      CLINICAL_SIGNIFICANCE_CATEGORIES,
    ),
    cell: helper.format.badge<Variant>(
      getBadgeColorMap(CLINICAL_SIGNIFICANCE_CATEGORIES),
      "gray",
    ),
  }),
  helper.accessor("clnsigincl", {
    header: "Clinical Significance (Genotype)",
    description:
      "Clinical significance for a haplotype or genotype that includes this variant. Reported as pairs of VariationID:clinical significance. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";

      // Split by comma, pipe, or semicolon and parse ID:significance pairs
      const pairs = val.split(/[,|;]/).map((pair) => pair.trim()).filter((pair) => pair);

      return (
        <div className="space-y-1">
          {pairs.map((pair, idx) => {
            const [id, significance] = pair.split(":").map((s) => s.trim());
            if (!significance) return <div key={idx}>{pair.replace(/_/g, " ")}</div>;

            // Find matching category to get color
            const match = CLINICAL_SIGNIFICANCE_CATEGORIES.find((cat) => {
              if (cat.pattern instanceof RegExp) {
                return cat.pattern.test(significance);
              }
              return significance === cat.pattern;
            });

            const colorKey = match?.color || "gray";
            const colorClasses: Record<string, string> = {
              red: "bg-red-300/90 text-red-950",
              orange: "bg-orange-300/90 text-orange-950",
              green: "bg-green-300/90 text-green-950",
              lime: "bg-lime-300/90 text-lime-950",
              yellow: "bg-yellow-300/90 text-yellow-950",
              amber: "bg-amber-300/90 text-amber-950",
              purple: "bg-purple-300/90 text-purple-950",
              blue: "bg-blue-300/90 text-blue-950",
              violet: "bg-violet-300/90 text-violet-950",
              emerald: "bg-emerald-300/90 text-emerald-950",
              gray: "bg-gray-300/90 text-gray-950",
            };

            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono">{id}:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${colorClasses[colorKey]}`}
                >
                  {significance.replace(/_/g, " ")}
                </span>
              </div>
            );
          })}
        </div>
      );
    }),
  }),
  helper.accessor("clndn", {
    header: "Disease Name",
    description:
      "ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";

      const diseases = val
        .split(/[|,]/)
        .map((d) => d.trim().replace(/_/g, " "))
        .filter((d) => d);

      if (diseases.length === 1) {
        return <span>{diseases[0]}</span>;
      }

      return (
        <div className="space-y-0.5">
          {diseases.map((disease, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{disease}</span>
            </div>
          ))}
        </div>
      );
    }),
  }),
  helper.accessor("clndnincl", {
    header: "Disease Name (Variant Includes)",
    description:
      "For included variant: ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";

      const diseases = val
        .split(/[|,]/)
        .map((d) => d.trim().replace(/_/g, " "))
        .filter((d) => d);

      if (diseases.length === 1) {
        return <span>{diseases[0]}</span>;
      }

      return (
        <div className="space-y-0.5">
          {diseases.map((disease, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{disease}</span>
            </div>
          ))}
        </div>
      );
    }),
  }),
  helper.accessor("clnrevstat", {
    header: "Review Status",
    description: renderCategoryDescription(
      <p>
        ClinVar review status for the Variation ID. (Landrum et al., 2017,
        2013)
      </p>,
      REVIEW_STATUS_CATEGORIES,
    ),
    cell: helper.format.badge<Variant>(
      getBadgeColorMap(REVIEW_STATUS_CATEGORIES),
      "gray",
    ),
  }),
  helper.accessor("origin", {
    header: "Allele Origin",
    description: renderCategoryDescription(
      <p>
        Allele origin. One or more of the following values may be added: 0 -
        unknown; 1 - germline; 2 - somatic; 4 - inherited; 8 - paternal; 16 -
        maternal; 32 - de-novo; 64 - biparental; 128 - uniparental; 256 -
        not-tested; 512 - tested-inconclusive. (Landrum et al., 2017, 2013)
      </p>,
      ALLELE_ORIGIN_CATEGORIES,
    ),
    cell: helper.format.custom((val: any) => {
      if (!val) return "-";

      // Map numeric codes to text
      const originMap: { [key: number]: string } = {
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

      const originText = originMap[val] || val;
      if (!originText) return "-";

      // Find matching category to get color
      const match = ALLELE_ORIGIN_CATEGORIES.find((cat) => {
        if (cat.pattern instanceof RegExp) {
          return cat.pattern.test(originText);
        }
        return originText === cat.pattern;
      });

      const colorKey = match?.color || "gray";

      // Reuse the same color classes from the badge formatter
      const colorClasses: Record<string, string> = {
        blue: "bg-blue-300/90 text-blue-950",
        rose: "bg-rose-300/90 text-rose-950",
        purple: "bg-purple-300/90 text-purple-950",
        cyan: "bg-cyan-300/90 text-cyan-950",
        indigo: "bg-indigo-300/90 text-indigo-950",
        violet: "bg-violet-300/90 text-violet-950",
        teal: "bg-teal-300/90 text-teal-950",
        lime: "bg-lime-300/90 text-lime-950",
        gray: "bg-gray-300/90 text-gray-950",
        stone: "bg-stone-300/90 text-stone-950",
        amber: "bg-amber-300/90 text-amber-950",
      };

      const className = colorClasses[colorKey] || colorClasses.gray;

      return (
        <span
          className={`inline-flex items-center px-2.5 py-1.5 rounded-full font-medium capitalize ${className}`}
        >
          {originText.replace(/_/g, " ").replace(/-/g, " ")}
        </span>
      );
    }),
  }),
  helper.accessor("clndisdb", {
    header: "Disease Database ID",
    description:
      "Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";

      // Split by comma or space, but keep database:ID pairs together
      const entries = val
        .split(/,\s*|\s+(?=[A-Z])/)
        .map((entry) => entry.trim())
        .filter((entry) => entry);

      return (
        <div className="space-y-0.5">
          {entries.map((entry, idx) => {
            const [database, id] = entry.split(":");
            if (!id) {
              return (
                <div key={idx} className="font-mono">
                  {entry}
                </div>
              );
            }

            return (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">
                  {database}:
                </span>
                <span className="font-mono text-foreground">{id}</span>
              </div>
            );
          })}
        </div>
      );
    }),
  }),
  helper.accessor("clndisdbincl", {
    header: "Disease Database ID (included variant)",
    description:
      "For included variant: Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";

      // Split by comma or space, but keep database:ID pairs together
      const entries = val
        .split(/,\s*|\s+(?=[A-Z])/)
        .map((entry) => entry.trim())
        .filter((entry) => entry);

      return (
        <div className="space-y-0.5">
          {entries.map((entry, idx) => {
            const [database, id] = entry.split(":");
            if (!id) {
              return (
                <div key={idx} className="font-mono">
                  {entry}
                </div>
              );
            }

            return (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">
                  {database}:
                </span>
                <span className="font-mono text-foreground">{id}</span>
              </div>
            );
          })}
        </div>
      );
    }),
  }),
  helper.accessor("geneinfo", {
    header: "Gene Reported",
    description:
      "Gene(s) for the variant reported as gene symbol:gene id. The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|). (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      if (!val) return "-";
      const gene = val.split(":")[0];
      return (
        <ExternalLink
          href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${gene}%5Bgene%5D&redir=gene`}
        >
          {val}
        </ExternalLink>
      );
    }),
  }),
]);
