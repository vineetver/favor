import { ExternalLink } from "@/shared/components/ui/external-link";
import type { OpenTargetsCredibleSetRow } from "@/features/variant/types/opentargets";
import {
  Badge,
  categories,
  createColumns,
  tooltip,
} from "@/infrastructure/table/column-builder";

const col = createColumns<OpenTargetsCredibleSetRow>();

// Study type categories
const studyTypeCategories = categories([
  {
    label: "GWAS",
    match: "gwas",
    color: "blue",
    description: "Genome-Wide Association Study",
  },
  {
    label: "eQTL",
    match: "eqtl",
    color: "violet",
    description: "Expression Quantitative Trait Locus study",
  },
  {
    label: "pQTL",
    match: "pqtl",
    color: "purple",
    description: "Protein Quantitative Trait Locus study",
  },
  {
    label: "sQTL",
    match: "sqtl",
    color: "fuchsia",
    description: "Splicing Quantitative Trait Locus study",
  },
]);

// Fine-mapping method categories
const methodCategories = categories([
  {
    label: "SuSiE",
    match: "SuSiE",
    color: "blue",
    description: "Sum of Single Effects model for fine-mapping",
  },
  {
    label: "FINEMAP",
    match: "FINEMAP",
    color: "violet",
    description: "Shotgun stochastic search algorithm",
  },
  {
    label: "CARMA",
    match: "CARMA",
    color: "purple",
    description: "Causal Variants Identification in Associated Regions",
  },
]);

function formatPValue(pval: number | null): string {
  if (pval === null) return "-";
  if (pval < 1e-300) return "<1e-300";
  if (pval < 0.0001) return pval.toExponential(2);
  return pval.toFixed(4);
}

export const openTargetsCredibleSetsColumns = [
  col.display("traitFromSource", {
    header: "Trait",
    description: tooltip({
      title: "Associated Trait",
      description:
        "The trait or phenotype from the original study associated with this credible set.",
    }),
    cell: ({ row }) => {
      const val = row.original.traitFromSource;
      if (!val) return "-";
      return val.length > 60 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 60)}...
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  col.display("studyType", {
    header: "Type",
    description: tooltip({
      title: "Study Type",
      description: "Type of genetic association study.",
      categories: studyTypeCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.studyType;
      if (!val) return "-";
      const color = studyTypeCategories.getColor(val.toLowerCase());
      return <Badge color={color}>{val.toUpperCase()}</Badge>;
    },
  }),

  col.display("pValue", {
    header: "P-value",
    description: tooltip({
      title: "P-value",
      description:
        "Statistical significance of the association, computed from mantissa and exponent.",
    }),
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {formatPValue(row.original.pValue)}
      </span>
    ),
  }),

  col.display("beta", {
    header: "Beta",
    description: tooltip({
      title: "Effect Size (Beta)",
      description: "Estimated effect size of the variant on the trait.",
    }),
    cell: ({ row }) => {
      const val = row.original.beta;
      if (val === null) return "-";
      return <span className="font-mono text-sm">{val.toFixed(4)}</span>;
    },
  }),

  col.display("finemappingMethod", {
    header: "Method",
    description: tooltip({
      title: "Fine-mapping Method",
      description:
        "Statistical method used for fine-mapping the causal variants.",
      categories: methodCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.finemappingMethod;
      if (!val) return "-";
      const color = methodCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("l2gGeneCount", {
    header: "L2G Genes",
    description: tooltip({
      title: "L2G Gene Count",
      description: "Number of genes with L2G predictions in this credible set.",
    }),
    cell: ({ row }) => {
      const val = row.original.l2gGeneCount;
      return val > 0 ? (
        <Badge color="emerald">{val}</Badge>
      ) : (
        <span className="text-muted-foreground">0</span>
      );
    },
  }),

  col.display("locusVariantCount", {
    header: "Variants",
    description: tooltip({
      title: "Locus Variant Count",
      description: "Number of variants in this credible set locus.",
    }),
    cell: ({ row }) => {
      const val = row.original.locusVariantCount;
      return <span className="font-mono">{val}</span>;
    },
  }),

  col.display("sampleSize", {
    header: "Sample Size",
    description: tooltip({
      title: "Study Sample Size",
      description: "Total number of samples in the original study.",
    }),
    cell: ({ row }) => {
      const val = row.original.sampleSize;
      return val ? (
        <span className="font-mono">{val.toLocaleString()}</span>
      ) : (
        "-"
      );
    },
  }),

  col.display("studyId", {
    header: "Study",
    description: tooltip({
      title: "Study ID",
      description: "Open Targets study identifier linked to the study page.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const studyId = row.original.studyId;
      const displayId =
        studyId.length > 20 ? `${studyId.slice(0, 20)}...` : studyId;
      return (
        <ExternalLink
          href={`https://platform.opentargets.org/study/${studyId}`}
          className="font-mono text-sm"
        >
          {displayId}
        </ExternalLink>
      );
    },
  }),
];
