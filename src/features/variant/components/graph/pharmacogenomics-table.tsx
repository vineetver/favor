"use client";

import {
  Badge,
  categories,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";
import { DataSurface } from "@shared/components/ui/data-surface";
import Link from "next/link";

// =============================================================================
// Row type
// =============================================================================

export interface PharmacogenomicsRow {
  id: string;
  drugName: string;
  drugId: string;
  type: "drug_response" | "side_effect";
  clinicalSignificance: string;
  directionOfEffect: string;
  evidenceCount: number | null;
  geneSymbol: string;
  confidence: string;
  source: string;
}

// =============================================================================
// Category mappings
// =============================================================================

const typeCategories = categories([
  {
    label: "Drug Response",
    match: "drug_response",
    color: "blue",
    description: "Drug response association from PharmGKB",
  },
  {
    label: "Side Effect",
    match: "side_effect",
    color: "amber",
    description: "Side effect association from PharmGKB",
  },
]);

const significanceCategories = categories([
  {
    label: "Pathogenic",
    match: /pathogenic/i,
    color: "red",
    description: "Pathogenic clinical significance",
  },
  {
    label: "Likely Pathogenic",
    match: /likely.pathogenic/i,
    color: "orange",
    description: "Likely pathogenic clinical significance",
  },
  {
    label: "Benign",
    match: /benign/i,
    color: "emerald",
    description: "Benign clinical significance",
  },
  {
    label: "Likely Benign",
    match: /likely.benign/i,
    color: "teal",
    description: "Likely benign clinical significance",
  },
  {
    label: "Uncertain",
    match: /uncertain/i,
    color: "gray",
    description: "Uncertain significance",
  },
]);

const confidenceCategories = categories([
  {
    label: "High",
    match: /high/i,
    color: "emerald",
    description: "High confidence association",
  },
  {
    label: "Medium",
    match: /medium|moderate/i,
    color: "amber",
    description: "Medium confidence association",
  },
  {
    label: "Low",
    match: /low/i,
    color: "gray",
    description: "Low confidence association",
  },
]);

const directionCategories = categories([
  {
    label: "Increased",
    match: /increase/i,
    color: "red",
    description: "Increased drug response or effect",
  },
  {
    label: "Decreased",
    match: /decrease/i,
    color: "blue",
    description: "Decreased drug response or effect",
  },
  {
    label: "No Change",
    match: /no.change|neutral/i,
    color: "gray",
    description: "No significant change in drug response",
  },
]);

// =============================================================================
// Column definitions
// =============================================================================

const col = createColumns<PharmacogenomicsRow>();

const columns = [
  col.display("drugName", {
    header: "Drug",
    description: tooltip({
      title: "Drug Name",
      description:
        "Name of the drug with pharmacogenomic association. Links to the FAVOR drug page when a ChEMBL identifier is available.",
      citation: "PharmGKB",
    }),
    cell: ({ row }) => {
      const { drugName, drugId, type } = row.original;
      if (!drugName || drugName === "Unknown") return "-";
      if (type === "drug_response" && drugId.includes("CHEMBL")) {
        return (
          <Link
            href={`/drug/${drugId}`}
            className="text-primary hover:underline font-medium"
          >
            {drugName}
          </Link>
        );
      }
      return <span className="font-medium">{drugName}</span>;
    },
  }),

  col.display("type", {
    header: "Type",
    description: tooltip({
      title: "Association Type",
      description:
        "Whether this is a drug response association or a side effect association.",
      categories: typeCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.type;
      const color = typeCategories.getColor(val);
      return (
        <Badge color={color}>
          {val === "drug_response" ? "Drug Response" : "Side Effect"}
        </Badge>
      );
    },
  }),

  col.display("clinicalSignificance", {
    header: "Clinical Significance",
    description: tooltip({
      title: "Clinical Significance",
      description:
        "Clinical significance of the variant-drug association as reported by PharmGKB.",
      categories: significanceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.clinicalSignificance;
      if (!val) return "-";
      const color = significanceCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("directionOfEffect", {
    header: "Direction of Effect",
    description: tooltip({
      title: "Direction of Effect",
      description:
        "Direction of the pharmacogenomic effect on drug response or metabolism.",
      categories: directionCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.directionOfEffect;
      if (!val) return "-";
      const color = directionCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("evidenceCount", {
    header: "Evidence Count",
    description: tooltip({
      title: "Evidence Count",
      description:
        "Number of supporting evidence items for this pharmacogenomic association.",
      citation: "PharmGKB",
    }),
    cell: ({ row }) => {
      const val = row.original.evidenceCount;
      if (val === null || val === undefined) return "-";
      return <span className="tabular-nums">{val.toLocaleString()}</span>;
    },
  }),

  col.display("geneSymbol", {
    header: "Gene",
    description: tooltip({
      title: "Gene Symbol",
      description:
        "Gene symbol associated with this pharmacogenomic side effect.",
    }),
    cell: ({ row }) => {
      const val = row.original.geneSymbol;
      if (!val) return "-";
      return <span className="font-medium">{val}</span>;
    },
  }),

  col.display("confidence", {
    header: "Confidence",
    description: tooltip({
      title: "Confidence Class",
      description:
        "Confidence level of the side effect association based on supporting evidence.",
      categories: confidenceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.confidence;
      if (!val) return "-";
      const color = confidenceCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("source", {
    header: "Source",
    description: tooltip({
      title: "Data Source",
      description:
        "The upstream database that produced this pharmacogenomic association.",
    }),
    cell: ({ row }) => {
      const val = row.original.source;
      if (!val) return "-";
      return <Badge color="violet">{val}</Badge>;
    },
  }),
];

// =============================================================================
// Component
// =============================================================================

interface PharmacogenomicsTableProps {
  data: PharmacogenomicsRow[];
}

export function PharmacogenomicsTable({ data }: PharmacogenomicsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={columns}
      title="Pharmacogenomics"
      subtitle="Drug response and side effect associations from the FAVOR knowledge graph"
      searchPlaceholder="Search drugs or genes..."
      searchColumn="drugName"
      exportable
      exportFilename="pharmacogenomics"
      defaultPageSize={10}
    />
  );
}
