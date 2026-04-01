"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { createColumns, tooltip } from "@infra/table/column-builder";

// ============================================================================
// Row type
// ============================================================================

export interface CredibleSetRow {
  id: string;
  studyId: string;
  studyTrait: string;
  studyTitle: string;
  traitName: string;
  pValueMlog: number | null;
  orBeta: number | null;
  riskAllele: string;
  source: string;
}

// ============================================================================
// Columns
// ============================================================================

const col = createColumns<CredibleSetRow>();

const credibleSetsColumns = [
  col.display("studyTrait", {
    header: "Study Trait",
    description: tooltip({
      title: "Study Trait",
      description:
        "The trait or phenotype associated with this variant in the GWAS study.",
    }),
    cell: ({ row }) => {
      const val = row.original.studyTrait || row.original.traitName;
      if (!val) return <span className="text-muted-foreground">-</span>;
      return val.length > 70 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 70)}...
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  col.display("studyTitle", {
    header: "Study Title",
    description: tooltip({
      title: "Study Title",
      description: "Title of the GWAS study reporting this association.",
    }),
    cell: ({ row }) => {
      const val = row.original.studyTitle;
      if (!val) return <span className="text-muted-foreground">-</span>;
      return val.length > 60 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 60)}...
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  col.display("pValueMlog", {
    header: "-log\u2081\u2080(P)",
    description: tooltip({
      title: "-log\u2081\u2080(P-value)",
      description:
        "Negative log base 10 of the association p-value. Higher values indicate stronger statistical significance.",
    }),
    cell: ({ row }) => {
      const val = row.original.pValueMlog;
      if (val === null) return <span className="text-muted-foreground">-</span>;
      return <span className="font-mono text-sm">{val.toFixed(2)}</span>;
    },
  }),

  col.display("orBeta", {
    header: "OR/Beta",
    description: tooltip({
      title: "Odds Ratio / Beta",
      description:
        "Effect size of the variant-trait association. For binary traits this is an odds ratio; for quantitative traits it is the beta coefficient.",
    }),
    cell: ({ row }) => {
      const val = row.original.orBeta;
      if (val === null) return <span className="text-muted-foreground">-</span>;
      return <span className="font-mono text-sm">{val.toFixed(4)}</span>;
    },
  }),

  col.display("riskAllele", {
    header: "Risk Allele",
    description: tooltip({
      title: "Risk Allele",
      description: "The allele associated with increased trait risk or effect.",
    }),
    cell: ({ row }) => {
      const val = row.original.riskAllele;
      if (!val) return <span className="text-muted-foreground">-</span>;
      return <span className="font-mono text-sm">{val}</span>;
    },
  }),

  col.display("source", {
    header: "Source",
    description: tooltip({
      title: "Source",
      description:
        "The entity type of the linked study node in the knowledge graph.",
    }),
    cell: ({ row }) => {
      const val = row.original.source;
      if (!val) return <span className="text-muted-foreground">-</span>;
      return <span className="text-sm">{val}</span>;
    },
  }),
];

// ============================================================================
// Component
// ============================================================================

interface CredibleSetsTableProps {
  data: CredibleSetRow[];
}

export function CredibleSetsTable({ data }: CredibleSetsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={credibleSetsColumns}
      title="GWAS Fine-Mapping"
      subtitle="GWAS study associations for this variant from the FAVOR knowledge graph"
      searchPlaceholder="Search traits or studies..."
      searchColumn="studyTrait"
      exportable
      exportFilename="credible-sets"
      defaultPageSize={10}
    />
  );
}
