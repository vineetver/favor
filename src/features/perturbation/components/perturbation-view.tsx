"use client";

import { cn } from "@infra/utils";
import type { CrisprRow, PerturbSeqRow, MaveRow } from "../types";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import { Badge } from "@shared/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums mt-0.5", highlight ? "text-destructive" : "text-foreground")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared cell renderers
// ---------------------------------------------------------------------------

function MagnitudeBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full", value < 0 ? "bg-blue-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GeneLink({ gene }: { gene: string }) {
  return (
    <Link href={`/hg38/gene/${encodeURIComponent(gene)}`} className="text-sm font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
      {gene}
    </Link>
  );
}

function PvalueCell({ value }: { value: number | undefined }) {
  if (value == null) return <Dash />;
  return <span className="text-xs tabular-nums text-muted-foreground">{value < 0.001 ? value.toExponential(1) : value.toFixed(3)}</span>;
}

// ---------------------------------------------------------------------------
// Perturb-seq columns — shared between downstream and upstream
// ---------------------------------------------------------------------------

function buildPerturbSeqColumns(
  geneColumn: { id: string; key: "effect_gene" | "perturbation_gene"; header: string },
  maxLog2fc: number,
): ColumnDef<PerturbSeqRow, unknown>[] {
  return [
    {
      id: geneColumn.id,
      accessorKey: geneColumn.key,
      header: geneColumn.header,
      enableSorting: false,
      cell: ({ getValue }) => <GeneLink gene={getValue() as string} />,
    },
    {
      id: "log2fc",
      accessorKey: "log2fc",
      header: "Log2 FC",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return <span className="text-xs tabular-nums text-foreground">{v > 0 ? "+" : ""}{v.toFixed(2)}</span>;
      },
    },
    {
      id: "direction",
      accessorFn: (r) => r.log2fc,
      header: "Direction",
      enableSorting: false,
      cell: ({ row }) => <span className={cn("text-xs font-medium", row.original.log2fc < 0 ? "text-blue-600" : "text-red-600")}>{row.original.log2fc < 0 ? "down" : "up"}</span>,
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.log2fc),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <MagnitudeBar value={row.original.log2fc} max={maxLog2fc} />,
    },
    {
      id: "padj",
      accessorKey: "padj",
      header: "Adj. P-Value",
      enableSorting: true,
      cell: ({ getValue }) => <PvalueCell value={getValue() as number | undefined} />,
    },
    {
      id: "cell_type",
      accessorKey: "cell_type",
      header: "Cell Type",
      enableSorting: false,
      cell: ({ getValue }) => {
        const ct = getValue() as string | undefined;
        if (!ct) return <Dash />;
        return <Badge variant="outline" className="text-[11px]">{ct}</Badge>;
      },
    },
    {
      id: "dataset_id",
      accessorKey: "dataset_id",
      header: "Dataset",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-[140px] block">{getValue() as string}</span>,
    },
  ];
}

// ---------------------------------------------------------------------------
// CRISPR columns
// ---------------------------------------------------------------------------

function buildCrisprColumns(maxScore: number): ColumnDef<CrisprRow, unknown>[] {
  return [
    {
      id: "cell_line",
      accessorKey: "cell_line",
      header: "Cell Line",
      enableSorting: false,
      cell: ({ getValue }) => <span className="text-sm font-medium text-foreground">{(getValue() as string) || "\u2014"}</span>,
    },
    {
      id: "disease",
      accessorKey: "disease",
      header: "Disease",
      enableSorting: false,
      cell: ({ getValue }) => {
        const d = getValue() as string | undefined;
        if (!d) return <Dash />;
        return <span className="text-xs text-muted-foreground">{d}</span>;
      },
    },
    {
      id: "score_value",
      accessorKey: "score_value",
      header: "Score",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => <span className="text-xs tabular-nums text-foreground">{(getValue() as number).toFixed(2)}</span>,
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.score_value),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <MagnitudeBar value={row.original.score_value} max={maxScore} />,
    },
    {
      id: "is_significant",
      accessorKey: "is_significant",
      header: "Significant",
      enableSorting: true,
      cell: ({ getValue }) => {
        const sig = getValue() as boolean;
        return <span className={cn("text-xs font-medium", sig ? "text-red-500" : "text-muted-foreground")}>{sig ? "Yes" : "No"}</span>;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Cell type filter
// ---------------------------------------------------------------------------

function CellTypeTabs({ cellTypes, selected, onSelect }: { cellTypes: string[]; selected: string | null; onSelect: (ct: string | null) => void }) {
  if (cellTypes.length <= 1) return null;
  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} className={cn("px-3 py-1.5 text-xs rounded-md transition-colors", active ? "bg-background shadow-sm text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg mb-4">
      {btn("All cell", selected === null, () => onSelect(null))}
      {cellTypes.map((ct) => btn(ct, selected === ct, () => onSelect(ct)))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function DownstreamSection({ data, geneSymbol, totalCount }: { data: PerturbSeqRow[]; geneSymbol: string; totalCount: number }) {
  const cellTypes = useMemo(() => [...new Set(data.map((r) => r.cell_type).filter(Boolean) as string[])].sort(), [data]);
  const [selectedCellType, setSelectedCellType] = useState<string | null>(null);
  const filtered = useMemo(() => selectedCellType ? data.filter((r) => r.cell_type === selectedCellType) : data, [data, selectedCellType]);
  const maxLog2fc = useMemo(() => Math.max(...filtered.map((r) => Math.abs(r.log2fc)), 1), [filtered]);
  const columns = useMemo(() => buildPerturbSeqColumns({ id: "effect_gene", key: "effect_gene", header: "Effect Gene" }, maxLog2fc), [maxLog2fc]);

  return (
    <div>
      <CellTypeTabs cellTypes={cellTypes} selected={selectedCellType} onSelect={setSelectedCellType} />
      <DataSurface
        title={`Downstream effects of ${geneSymbol} knockout`}
        subtitle={`${totalCount} genes significantly affected when ${geneSymbol} is knocked out (perturb-seq, padj < 0.05)`}
        data={filtered} columns={columns} searchable={false} defaultPageSize={25} pageSizeOptions={[25, 50]}
        exportable exportFilename={`downstream-effects-${geneSymbol}`} emptyMessage={`No perturb-seq downstream effects found for ${geneSymbol}`}
      />
    </div>
  );
}

function UpstreamSection({ data, geneSymbol }: { data: PerturbSeqRow[]; geneSymbol: string }) {
  const maxLog2fc = useMemo(() => Math.max(...data.map((r) => Math.abs(r.log2fc)), 1), [data]);
  const columns = useMemo(() => {
    const cols = buildPerturbSeqColumns({ id: "perturbation_gene", key: "perturbation_gene", header: "Perturbation Gene" }, maxLog2fc);
    return cols.filter((c) => c.id !== "dataset_id"); // upstream table doesn't need dataset column
  }, [maxLog2fc]);

  return (
    <DataSurface
      title={`Upstream regulators of ${geneSymbol}`}
      subtitle={`Which gene knockouts significantly change ${geneSymbol} expression? (reverse lookup)`}
      data={data} columns={columns} searchable={false} defaultPageSize={25} pageSizeOptions={[25, 50]}
      exportable exportFilename={`upstream-regulators-${geneSymbol}`} emptyMessage={`No upstream regulators found for ${geneSymbol}`}
    />
  );
}

function CrisprSection({ data, geneSymbol, totalCount }: { data: CrisprRow[]; geneSymbol: string; totalCount: number }) {
  const maxScore = useMemo(() => Math.max(...data.map((r) => Math.abs(r.score_value)), 1), [data]);
  const columns = useMemo(() => buildCrisprColumns(maxScore), [maxScore]);

  return (
    <DataSurface
      title="CRISPR essentiality across cell lines"
      subtitle={`${geneSymbol} fitness scores from ${totalCount.toLocaleString()} CRISPR screens`}
      data={data} columns={columns} searchable={false} defaultPageSize={25} pageSizeOptions={[25, 50]}
      exportable exportFilename={`crispr-essentiality-${geneSymbol}`} emptyMessage={`No CRISPR essentiality data found for ${geneSymbol}`}
    />
  );
}

// ---------------------------------------------------------------------------
// MAVE columns
// ---------------------------------------------------------------------------

const maveColumns: ColumnDef<MaveRow, unknown>[] = [
  {
    id: "perturbation_name",
    accessorKey: "perturbation_name",
    header: "Variant",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-xs font-mono text-foreground">{getValue() as string}</span>,
  },
  {
    id: "position",
    accessorKey: "position",
    header: "Position",
    enableSorting: true,
    cell: ({ getValue }) => <span className="text-xs tabular-nums text-muted-foreground">{getValue() as number}</span>,
  },
  {
    id: "aa_change",
    accessorFn: (r) => r.aa_wt && r.aa_change ? `${r.aa_wt}→${r.aa_change}` : null,
    header: "AA Change",
    enableSorting: false,
    cell: ({ row }) => {
      const { aa_wt, aa_change } = row.original;
      if (!aa_wt || !aa_change) return <Dash />;
      const isSyn = aa_change === "=";
      return (
        <span className={cn("text-xs", isSyn ? "text-muted-foreground" : "text-foreground")}>
          {aa_wt}{isSyn ? " (syn)" : `→${aa_change}`}
        </span>
      );
    },
  },
  {
    id: "score_value",
    accessorKey: "score_value",
    header: "Score",
    enableSorting: true,
    sortDescFirst: true,
    cell: ({ getValue }) => <span className="text-xs tabular-nums text-foreground">{(getValue() as number).toFixed(4)}</span>,
  },
  {
    id: "score_name",
    accessorKey: "score_name",
    header: "Score Type",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span>,
  },
  {
    id: "dataset_id",
    accessorKey: "dataset_id",
    header: "Dataset",
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-xs text-muted-foreground truncate max-w-[180px] block">{getValue() as string}</span>,
  },
];

function MaveSection({ data, geneSymbol, totalCount }: { data: MaveRow[]; geneSymbol: string; totalCount: number }) {
  const datasets = useMemo(() => new Set(data.map((r) => r.dataset_id)).size, [data]);
  return (
    <DataSurface
      title="MAVE variant effect scores"
      subtitle={`${totalCount.toLocaleString()} functional scores from ${datasets} MaveDB dataset${datasets !== 1 ? "s" : ""} for ${geneSymbol}`}
      data={data} columns={maveColumns} searchable={false} defaultPageSize={25} pageSizeOptions={[25, 50, 100]}
      exportable exportFilename={`mave-scores-${geneSymbol}`} emptyMessage={`No MAVE data found for ${geneSymbol}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface PerturbationViewProps {
  geneSymbol: string;
  summary: { perturbSeqDatasets: number; downstreamTargets: number; crisprScreens: number; essentialIn: number; maveScores: number };
  downstream: PerturbSeqRow[];
  upstream: PerturbSeqRow[];
  crispr: CrisprRow[];
  mave: MaveRow[];
  crisprTotalCount: number;
  downstreamTotalCount: number;
  maveTotalCount: number;
}

export function PerturbationView({ geneSymbol, summary, downstream, upstream, crispr, mave, crisprTotalCount, downstreamTotalCount, maveTotalCount }: PerturbationViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Perturb-seq datasets" value={summary.perturbSeqDatasets} />
        <StatCard label="Downstream targets" value={summary.downstreamTargets} />
        <StatCard label="CRISPR screens" value={summary.crisprScreens} />
        <StatCard label="Essential in" value={`${summary.essentialIn} lines`} highlight />
        <StatCard label="MAVE scores" value={summary.maveScores} />
      </div>
      {downstream.length > 0 && <DownstreamSection data={downstream} geneSymbol={geneSymbol} totalCount={downstreamTotalCount} />}
      {upstream.length > 0 && <UpstreamSection data={upstream} geneSymbol={geneSymbol} />}
      {crispr.length > 0 && <CrisprSection data={crispr} geneSymbol={geneSymbol} totalCount={crisprTotalCount} />}
      {mave.length > 0 && <MaveSection data={mave} geneSymbol={geneSymbol} totalCount={maveTotalCount} />}
    </div>
  );
}
