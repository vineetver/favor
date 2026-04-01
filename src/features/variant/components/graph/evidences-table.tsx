"use client";

import Link from "next/link";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import type { ColumnDef } from "@tanstack/react-table";

// ============================================================================
// Row type — exported so the server page can use it
// ============================================================================

export interface DiseaseEvidenceRow {
  id: string;
  traitName: string;
  traitType: string;
  traitId: string;
  clinicalSignificance: string;
  pValueMlog: number | null;
  orBeta: number | null;
  riskAllele: string;
  confidence: string;
  source: string;
}

// ============================================================================
// Badge helpers
// ============================================================================

const TRAIT_TYPE_STYLES: Record<string, string> = {
  Disease:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  Entity:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
  Phenotype:
    "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
};

function TraitBadge({ type }: { type: string }) {
  const style = TRAIT_TYPE_STYLES[type] ?? "bg-muted text-muted-foreground ring-1 ring-border/60";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${style}`}
    >
      {type}
    </span>
  );
}

const SIGNIFICANCE_STYLES: Record<string, string> = {
  pathogenic: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
  "likely pathogenic": "bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
  benign: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  "likely benign": "bg-teal-50 text-teal-700 ring-1 ring-teal-200/60",
  "uncertain significance": "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
};

function SignificanceBadge({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">&mdash;</span>;
  const lower = value.toLowerCase();
  const style =
    SIGNIFICANCE_STYLES[lower] ??
    "bg-muted text-muted-foreground ring-1 ring-border/60";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${style}`}
    >
      {value}
    </span>
  );
}

// ============================================================================
// Columns
// ============================================================================

const columns: ColumnDef<DiseaseEvidenceRow>[] = [
  {
    id: "traitName",
    accessorKey: "traitName",
    header: "Disease / Trait",
    enableSorting: true,
    filterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.traitName.toLowerCase().includes(q) ||
        row.original.traitId.toLowerCase().includes(q)
      );
    },
    cell: ({ row }) => {
      const { traitName, traitType, traitId } = row.original;
      if (!traitName) return <span className="text-muted-foreground">&mdash;</span>;

      const display =
        traitName.length > 60 ? `${traitName.slice(0, 60)}...` : traitName;

      if (traitType === "Disease" && traitId) {
        return (
          <Link
            href={`/disease/${encodeURIComponent(traitId)}`}
            className="text-primary hover:underline text-[13px]"
            title={traitName}
          >
            {display}
          </Link>
        );
      }

      return (
        <span className="text-[13px]" title={traitName}>
          {display}
        </span>
      );
    },
  },
  {
    id: "traitType",
    accessorKey: "traitType",
    header: "Type",
    enableSorting: true,
    cell: ({ row }) => <TraitBadge type={row.original.traitType} />,
  },
  {
    id: "clinicalSignificance",
    accessorKey: "clinicalSignificance",
    header: "Clinical Significance",
    enableSorting: true,
    cell: ({ row }) => (
      <SignificanceBadge value={row.original.clinicalSignificance} />
    ),
  },
  {
    id: "pValueMlog",
    accessorKey: "pValueMlog",
    header: "-log\u2081\u2080(P)",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original.pValueMlog;
      if (v == null) return <span className="text-muted-foreground">&mdash;</span>;
      return <span className="font-mono text-[13px]">{v.toFixed(1)}</span>;
    },
  },
  {
    id: "orBeta",
    accessorKey: "orBeta",
    header: "OR / Beta",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original.orBeta;
      if (v == null) return <span className="text-muted-foreground">&mdash;</span>;
      return <span className="font-mono text-[13px]">{v.toFixed(3)}</span>;
    },
  },
  {
    id: "riskAllele",
    accessorKey: "riskAllele",
    header: "Risk Allele",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original.riskAllele;
      if (!v) return <span className="text-muted-foreground">&mdash;</span>;
      return <span className="font-mono text-[13px]">{v}</span>;
    },
  },
  {
    id: "confidence",
    accessorKey: "confidence",
    header: "Confidence",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original.confidence;
      if (!v) return <span className="text-muted-foreground">&mdash;</span>;
      return <span className="text-[13px]">{v}</span>;
    },
  },
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    enableSorting: true,
    cell: ({ row }) => {
      const v = row.original.source;
      if (!v) return <span className="text-muted-foreground">&mdash;</span>;
      return <span className="text-[13px]">{v}</span>;
    },
  },
];

// ============================================================================
// Component
// ============================================================================

interface EvidencesTableProps {
  data: DiseaseEvidenceRow[];
}

export function EvidencesTable({ data }: EvidencesTableProps) {
  return (
    <DataSurface
      data={data}
      columns={columns}
      title="Disease Evidence"
      subtitle="Variant-trait associations from the FAVOR knowledge graph across diseases, phenotypes, and entities"
      searchPlaceholder="Search diseases or traits..."
      searchColumn="traitName"
      exportable
      exportFilename="disease-evidence"
      defaultPageSize={10}
      emptyMessage="No disease evidence data available for this variant"
    />
  );
}
