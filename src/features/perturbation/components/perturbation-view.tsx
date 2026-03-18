"use client";

import { cn } from "@infra/utils";
import type { CrisprRow, PerturbSeqRow, PerturbationSummary } from "../types";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Badge } from "@shared/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Summary stat cards
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums mt-0.5",
          highlight ? "text-destructive" : "text-foreground",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function SummaryCards({ summary }: { summary: PerturbationSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard label="Perturb-seq datasets" value={summary.perturbSeqDatasets} />
      <StatCard label="Downstream targets" value={summary.downstreamTargets} />
      <StatCard label="CRISPR screens" value={summary.crisprScreens} />
      <StatCard
        label="Essential in"
        value={`${summary.essentialIn} lines`}
        highlight
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Magnitude bar
// ---------------------------------------------------------------------------

function MagnitudeBar({ value, max }: { value: number; max: number }) {
  const abs = Math.abs(value);
  const pct = max > 0 ? Math.min((abs / max) * 100, 100) : 0;
  const isNeg = value < 0;
  return (
    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full",
          isNeg ? "bg-blue-500" : "bg-red-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Direction badge
// ---------------------------------------------------------------------------

function DirectionBadge({ value }: { value: number }) {
  const isDown = value < 0;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        isDown ? "text-blue-600" : "text-red-600",
      )}
    >
      {isDown ? "down" : "up"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cell type filter tabs
// ---------------------------------------------------------------------------

function CellTypeTabs({
  cellTypes,
  selected,
  onSelect,
}: {
  cellTypes: string[];
  selected: string | null;
  onSelect: (ct: string | null) => void;
}) {
  if (cellTypes.length <= 1) return null;
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg mb-4">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 text-xs rounded-md transition-colors",
          selected === null
            ? "bg-background shadow-sm text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        All cell
      </button>
      {cellTypes.map((ct) => (
        <button
          key={ct}
          onClick={() => onSelect(ct)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-md transition-colors",
            selected === ct
              ? "bg-background shadow-sm text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {ct}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perturb-seq columns (downstream effects)
// ---------------------------------------------------------------------------

function buildDownstreamColumns(
  maxLog2fc: number,
): ColumnDef<PerturbSeqRow, unknown>[] {
  return [
    {
      id: "effect_gene",
      accessorKey: "effect_gene",
      header: "Effect Gene",
      enableSorting: false,
      cell: ({ getValue }) => {
        const gene = getValue() as string;
        return (
          <Link
            href={`/hg38/gene/${encodeURIComponent(gene)}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {gene}
          </Link>
        );
      },
    },
    {
      id: "log2fc",
      accessorKey: "log2fc",
      header: "Log2 FC",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className="text-xs tabular-nums text-foreground">
            {v > 0 ? "+" : ""}
            {v.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "direction",
      accessorFn: (r) => r.log2fc,
      header: "Direction",
      enableSorting: false,
      cell: ({ row }) => <DirectionBadge value={row.original.log2fc} />,
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.log2fc),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <MagnitudeBar value={row.original.log2fc} max={maxLog2fc} />
      ),
    },
    {
      id: "padj",
      accessorKey: "padj",
      header: "Adj. P-Value",
      enableSorting: true,
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        if (v == null) return <Dash />;
        return (
          <span className="text-xs tabular-nums text-muted-foreground">
            {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
          </span>
        );
      },
    },
    {
      id: "cell_type",
      accessorKey: "cell_type",
      header: "Cell Type",
      enableSorting: false,
      cell: ({ getValue }) => {
        const ct = getValue() as string | undefined;
        if (!ct) return <Dash />;
        return (
          <Badge variant="outline" className="text-[11px]">
            {ct}
          </Badge>
        );
      },
    },
    {
      id: "dataset_id",
      accessorKey: "dataset_id",
      header: "Dataset",
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
          {getValue() as string}
        </span>
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Perturb-seq columns (upstream regulators)
// ---------------------------------------------------------------------------

function buildUpstreamColumns(
  geneSymbol: string,
  maxLog2fc: number,
): ColumnDef<PerturbSeqRow, unknown>[] {
  return [
    {
      id: "perturbation_gene",
      accessorKey: "perturbation_gene",
      header: "Perturbation Gene",
      enableSorting: false,
      cell: ({ getValue }) => {
        const gene = getValue() as string;
        return (
          <Link
            href={`/hg38/gene/${encodeURIComponent(gene)}`}
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {gene}
          </Link>
        );
      },
    },
    {
      id: "log2fc",
      accessorKey: "log2fc",
      header: `Effect on ${geneSymbol}`,
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className="text-xs tabular-nums text-foreground">
            {v > 0 ? "+" : ""}
            {v.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "direction",
      accessorFn: (r) => r.log2fc,
      header: "Direction",
      enableSorting: false,
      cell: ({ row }) => <DirectionBadge value={row.original.log2fc} />,
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.log2fc),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <MagnitudeBar value={row.original.log2fc} max={maxLog2fc} />
      ),
    },
    {
      id: "padj",
      accessorKey: "padj",
      header: "Adj. P-Value",
      enableSorting: true,
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        if (v == null) return <Dash />;
        return (
          <span className="text-xs tabular-nums text-muted-foreground">
            {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
          </span>
        );
      },
    },
    {
      id: "cell_type",
      accessorKey: "cell_type",
      header: "Cell Type",
      enableSorting: false,
      cell: ({ getValue }) => {
        const ct = getValue() as string | undefined;
        if (!ct) return <Dash />;
        return (
          <Badge variant="outline" className="text-[11px]">
            {ct}
          </Badge>
        );
      },
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
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-foreground">
          {(getValue() as string) || "\u2014"}
        </span>
      ),
    },
    {
      id: "disease",
      accessorKey: "disease",
      header: "Disease",
      enableSorting: false,
      cell: ({ getValue }) => {
        const d = getValue() as string | undefined;
        if (!d) return <Dash />;
        return (
          <span className="text-xs text-muted-foreground">{d}</span>
        );
      },
    },
    {
      id: "score_value",
      accessorKey: "score_value",
      header: "Score",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => (
        <span className="text-xs tabular-nums text-foreground">
          {(getValue() as number).toFixed(2)}
        </span>
      ),
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.score_value),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <MagnitudeBar value={row.original.score_value} max={maxScore} />
      ),
    },
    {
      id: "is_significant",
      accessorKey: "is_significant",
      header: "Significant",
      enableSorting: true,
      cell: ({ getValue }) => {
        const sig = getValue() as boolean;
        return (
          <span
            className={cn(
              "text-xs font-medium",
              sig ? "text-red-500" : "text-muted-foreground",
            )}
          >
            {sig ? "Yes" : "No"}
          </span>
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Downstream effects section
// ---------------------------------------------------------------------------

function DownstreamEffectsSection({
  data,
  geneSymbol,
  totalCount,
}: {
  data: PerturbSeqRow[];
  geneSymbol: string;
  totalCount: number;
}) {
  const cellTypes = useMemo(() => {
    const cts = new Set<string>();
    for (const r of data) {
      if (r.cell_type) cts.add(r.cell_type);
    }
    return [...cts].sort();
  }, [data]);

  const [selectedCellType, setSelectedCellType] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      selectedCellType
        ? data.filter((r) => r.cell_type === selectedCellType)
        : data,
    [data, selectedCellType],
  );

  const maxLog2fc = useMemo(
    () => Math.max(...filtered.map((r) => Math.abs(r.log2fc)), 1),
    [filtered],
  );

  const columns = useMemo(() => buildDownstreamColumns(maxLog2fc), [maxLog2fc]);

  const sigCount = data.filter((r) => r.is_significant).length;

  return (
    <div>
      <CellTypeTabs
        cellTypes={cellTypes}
        selected={selectedCellType}
        onSelect={setSelectedCellType}
      />
      <DataSurface
        title={`Downstream effects of ${geneSymbol} knockout`}
        subtitle={`${totalCount} genes significantly affected when ${geneSymbol} is knocked out (perturb-seq, padj < 0.05)`}
        data={filtered}
        columns={columns}
        searchable={false}
        defaultPageSize={25}
        pageSizeOptions={[25, 50]}
        exportable
        exportFilename={`downstream-effects-${geneSymbol}`}
        emptyMessage={`No perturb-seq downstream effects found for ${geneSymbol}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upstream regulators section
// ---------------------------------------------------------------------------

function UpstreamRegulatorsSection({
  data,
  geneSymbol,
}: {
  data: PerturbSeqRow[];
  geneSymbol: string;
}) {
  const maxLog2fc = useMemo(
    () => Math.max(...data.map((r) => Math.abs(r.log2fc)), 1),
    [data],
  );

  const columns = useMemo(
    () => buildUpstreamColumns(geneSymbol, maxLog2fc),
    [geneSymbol, maxLog2fc],
  );

  return (
    <DataSurface
      title={`Upstream regulators of ${geneSymbol}`}
      subtitle={`Which gene knockouts significantly change ${geneSymbol} expression? (reverse lookup)`}
      data={data}
      columns={columns}
      searchable={false}
      defaultPageSize={25}
      pageSizeOptions={[25, 50]}
      exportable
      exportFilename={`upstream-regulators-${geneSymbol}`}
      emptyMessage={`No upstream regulators found for ${geneSymbol}`}
    />
  );
}

// ---------------------------------------------------------------------------
// CRISPR essentiality section
// ---------------------------------------------------------------------------

function CrisprEssentialitySection({
  data,
  geneSymbol,
  totalCount,
}: {
  data: CrisprRow[];
  geneSymbol: string;
  totalCount: number;
}) {
  const maxScore = useMemo(
    () => Math.max(...data.map((r) => Math.abs(r.score_value)), 1),
    [data],
  );

  const columns = useMemo(() => buildCrisprColumns(maxScore), [maxScore]);

  return (
    <DataSurface
      title={`CRISPR essentiality across cell lines`}
      subtitle={`${geneSymbol} fitness scores from ${totalCount.toLocaleString()} CRISPR screens`}
      data={data}
      columns={columns}
      searchable={false}
      defaultPageSize={25}
      pageSizeOptions={[25, 50]}
      exportable
      exportFilename={`crispr-essentiality-${geneSymbol}`}
      emptyMessage={`No CRISPR essentiality data found for ${geneSymbol}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

interface PerturbationViewProps {
  geneSymbol: string;
  summary: PerturbationSummary;
  downstream: PerturbSeqRow[];
  upstream: PerturbSeqRow[];
  crispr: CrisprRow[];
  crisprTotalCount: number;
  downstreamTotalCount: number;
}

export function PerturbationView({
  geneSymbol,
  summary,
  downstream,
  upstream,
  crispr,
  crisprTotalCount,
  downstreamTotalCount,
}: PerturbationViewProps) {
  return (
    <div className="space-y-8">
      <SummaryCards summary={summary} />
      {downstream.length > 0 && (
        <DownstreamEffectsSection
          data={downstream}
          geneSymbol={geneSymbol}
          totalCount={downstreamTotalCount}
        />
      )}
      {upstream.length > 0 && (
        <UpstreamRegulatorsSection data={upstream} geneSymbol={geneSymbol} />
      )}
      {crispr.length > 0 && (
        <CrisprEssentialitySection
          data={crispr}
          geneSymbol={geneSymbol}
          totalCount={crisprTotalCount}
        />
      )}
    </div>
  );
}
