"use client";

import Link from "next/link";
import { DataSurface } from "@shared/components/ui/data-surface";
import {
  Badge,
  categories,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

// =============================================================================
// Row type
// =============================================================================

export interface L2GRow {
  id: string;
  geneId: string;
  geneSymbol: string;
  l2gScore: number | null;
  confidenceClass: string;
  implicationMode: string;
  nLoci: number | null;
  source: string;
}

// =============================================================================
// Category mappings
// =============================================================================

const confidenceCategories = categories([
  {
    label: "High",
    match: "high",
    color: "emerald",
    description: "Strong causal gene evidence from multiple sources",
  },
  {
    label: "Medium",
    match: "medium",
    color: "amber",
    description: "Moderate causal gene evidence with supporting data",
  },
  {
    label: "Low",
    match: "low",
    color: "gray",
    description: "Limited evidence, requires additional validation",
  },
]);

const sourceCategories = categories([
  {
    label: "ClinVar",
    match: "ClinVar",
    color: "blue",
    description: "Clinical variant database annotation",
  },
  {
    label: "Open Targets",
    match: "Open Targets",
    color: "violet",
    description: "Open Targets L2G machine learning prediction",
  },
  {
    label: "FAVOR",
    match: "FAVOR",
    color: "teal",
    description: "FAVOR knowledge graph prediction",
  },
]);

// =============================================================================
// Column definitions
// =============================================================================

const col = createColumns<L2GRow>();

const columns = [
  col.display("geneSymbol", {
    header: "Gene",
    description: tooltip({
      title: "Gene Symbol",
      description:
        "HGNC-approved symbol for the predicted causal gene at this locus.",
    }),
    cell: ({ row }) => {
      const { geneSymbol, geneId } = row.original;
      if (!geneSymbol) return "-";
      return (
        <Link
          href={`/hg38/gene/${geneId}/gene-level-annotation/summary`}
          className="text-primary hover:underline font-medium"
        >
          {geneSymbol}
        </Link>
      );
    },
  }),

  col.display("l2gScore", {
    header: "L2G Score",
    description: tooltip({
      title: "Locus-to-Gene Score",
      description:
        "Machine learning score predicting the causal gene at a GWAS locus. Higher scores indicate stronger evidence.",
      citation: "Mountjoy et al., 2021",
      range: "[0, 1]",
      guides: [
        { threshold: ">= 0.5", meaning: "High confidence causal gene" },
        { threshold: "0.1 - 0.5", meaning: "Moderate evidence" },
        { threshold: "< 0.1", meaning: "Lower confidence" },
      ],
    }),
    cell: ({ row }) => {
      const score = row.original.l2gScore;
      if (score === null || score === undefined) return "-";
      const color =
        score >= 0.5 ? "emerald" : score >= 0.1 ? "amber" : "gray";
      return <Badge color={color}>{score.toFixed(4)}</Badge>;
    },
  }),

  col.display("confidenceClass", {
    header: "Confidence",
    description: tooltip({
      title: "Confidence Class",
      description:
        "Confidence level of the causal gene assignment based on supporting evidence.",
      categories: confidenceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.confidenceClass;
      if (!val || val === "Unknown") return "-";
      const color = confidenceCategories.getColor(val.toLowerCase());
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("implicationMode", {
    header: "Implication Mode",
    description: tooltip({
      title: "Implication Mode",
      description:
        "The method or evidence type that implicates this gene as causal for the variant locus.",
    }),
    cell: ({ row }) => {
      const val = row.original.implicationMode;
      if (!val || val === "Unknown") return "-";
      return (
        <span className="text-sm">
          {val
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      );
    },
  }),

  col.display("nLoci", {
    header: "N Loci",
    description: tooltip({
      title: "Number of Loci",
      description:
        "Number of independent GWAS loci supporting this gene implication.",
    }),
    cell: ({ row }) => {
      const val = row.original.nLoci;
      if (val === null || val === undefined) return "-";
      return <span className="tabular-nums">{val.toLocaleString()}</span>;
    },
  }),

  col.display("source", {
    header: "Source",
    description: tooltip({
      title: "Data Source",
      description:
        "The upstream database or pipeline that produced this causal gene prediction.",
      categories: sourceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.source;
      if (!val) return "-";
      const color = sourceCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),
];

// =============================================================================
// Component
// =============================================================================

interface L2GTableProps {
  data: L2GRow[];
}

export function L2GTable({ data }: L2GTableProps) {
  return (
    <DataSurface
      data={data}
      columns={columns}
      title="Locus2Gene (L2G) Scores"
      subtitle="Causal gene predictions from ClinVar and Open Targets L2G models"
      searchPlaceholder="Search genes..."
      searchColumn="geneSymbol"
      exportable
      exportFilename="l2g-scores"
      defaultPageSize={10}
    />
  );
}
