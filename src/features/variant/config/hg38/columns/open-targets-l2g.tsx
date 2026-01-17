import { ExternalLink } from "@/components/ui/external-link";
import type { OpenTargetsL2GRow } from "@/features/variant/types/opentargets";
import {
  Badge,
  categories,
  cell,
  createColumns,
  tooltip,
} from "@/lib/table/column-builder";

const col = createColumns<OpenTargetsL2GRow>();

// Confidence level categories
const confidenceCategories = categories([
  {
    label: "High",
    match: "high",
    color: "emerald",
    description:
      "High confidence gene assignment based on multiple lines of evidence",
  },
  {
    label: "Medium",
    match: "medium",
    color: "amber",
    description: "Moderate confidence gene assignment with supporting evidence",
  },
  {
    label: "Low",
    match: "low",
    color: "gray",
    description:
      "Low confidence gene assignment requiring additional validation",
  },
]);

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

export const openTargetsL2GColumns = [
  col.display("geneSymbol", {
    header: "Gene",
    description: tooltip({
      title: "Gene Symbol",
      description: "HGNC-approved gene symbol for the predicted causal gene.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.geneSymbol;
      const geneId = row.original.geneId;
      if (!symbol) return "-";
      return (
        <ExternalLink
          href={`https://platform.opentargets.org/target/${geneId}`}
          className="font-medium"
        >
          {symbol}
        </ExternalLink>
      );
    },
  }),

  col.display("score", {
    header: "L2G Score",
    description: tooltip({
      title: "Locus-to-Gene Score",
      description:
        "Machine learning score predicting the causal gene at a GWAS locus. Higher scores indicate stronger evidence.",
      citation: "Mountjoy et al., 2021",
      range: "[0, 1]",
      guides: [
        { threshold: "> 0.5", meaning: "High confidence causal gene" },
        { threshold: "0.1 - 0.5", meaning: "Moderate evidence" },
        { threshold: "< 0.1", meaning: "Lower confidence" },
      ],
    }),
    cell: ({ row }) => {
      const score = row.original.score;
      const color = score > 0.5 ? "emerald" : score > 0.1 ? "amber" : "gray";
      return <Badge color={color}>{score.toFixed(4)}</Badge>;
    },
  }),

  col.display("traitFromSource", {
    header: "Trait",
    description: tooltip({
      title: "Associated Trait",
      description:
        "The trait or phenotype from the original GWAS study associated with this variant.",
    }),
    cell: ({ row }) => {
      const val = row.original.traitFromSource;
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

  col.display("studyType", {
    header: "Study Type",
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

  col.display("confidence", {
    header: "Confidence",
    description: tooltip({
      title: "Credible Set Confidence",
      description:
        "Confidence level of the underlying fine-mapped credible set from which this L2G prediction derives.",
      categories: confidenceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.confidence;
      if (!val) return "-";
      const color = confidenceCategories.getColor(val.toLowerCase());
      return <Badge color={color}>{val}</Badge>;
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
      return (
        <ExternalLink
          href={`https://platform.opentargets.org/study/${studyId}`}
          className="font-mono text-sm"
        >
          {studyId}
        </ExternalLink>
      );
    },
  }),
];
