"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import { Dash } from "@shared/components/ui/dash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { VariantCell } from "@shared/components/ui/variant-cell";
import { formatTissueName, formatPvalue } from "@shared/utils/tissue-format";
import { tissueGroupFilter, tissueFilter, significantOnlyFilter } from "./filter-helpers";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type {
  VariantAllelicImbalanceRow,
  PaginatedResponse,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useAllelicImbalanceQuery } from "@features/enrichment/hooks/use-allelic-imbalance-query";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortMarkLabel(raw: string): string {
  return raw
    .replace(/^HM-ChIP-seq_/, "")
    .replace(/^TF-ChIP-seq_/, "")
    .replace(/^ATAC-seq$/, "ATAC");
}

// ---------------------------------------------------------------------------
// Mark color map
// ---------------------------------------------------------------------------

const MARK_COLORS: Record<string, string> = {
  H3K27ac: "#f59e0b",
  H3K4me3: "#ef4444",
  H3K4me1: "#8b5cf6",
  CTCF: "#06b6d4",
  "ATAC-seq": "#10b981",
  ATAC: "#10b981",
  POLR2A: "#6366f1",
  POLR2AphosphoS5: "#6366f1",
};

function getMarkColor(mark: string): string {
  const short = shortMarkLabel(mark);
  return MARK_COLORS[short] ?? "#9ca3af";
}

// ---------------------------------------------------------------------------
// Allelic Ratio Dot Plot
// ---------------------------------------------------------------------------

interface AllelicRatioChartProps {
  data: VariantAllelicImbalanceRow[];
}

function AllelicRatioChart({ data }: AllelicRatioChartProps) {
  const rows = useMemo(() => {
    // Filter to rows that have a ref_allele_ratio
    const withRatio = data.filter((r) => r.ref_allele_ratio != null);
    if (withRatio.length < 2) return [];

    // Group by tissue_name + mark, keep highest neglog_pvalue per combo
    const grouped = new Map<string, VariantAllelicImbalanceRow>();
    for (const r of withRatio) {
      const key = `${r.tissue_name}::${r.mark}`;
      const existing = grouped.get(key);
      if (!existing || r.neglog_pvalue > existing.neglog_pvalue) {
        grouped.set(key, r);
      }
    }

    // Sort by neglog_pvalue descending, take top 20
    return Array.from(grouped.values())
      .sort((a, b) => b.neglog_pvalue - a.neglog_pvalue)
      .slice(0, 20);
  }, [data]);

  // Collect unique marks for legend
  const uniqueMarks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      const short = shortMarkLabel(r.mark);
      if (!seen.has(short)) seen.set(short, r.mark);
    }
    return Array.from(seen.entries()).map(([short, raw]) => ({
      label: short,
      color: getMarkColor(raw),
    }));
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Allelic Bias Direction
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reference allele ratio per mark &times; tissue. Center (0.5) = balanced.
          </p>
        </div>

        <div className="px-4 py-3">
          {/* Bias direction labels */}
          <div className="flex items-center" style={{ height: 16 }}>
            <div className="shrink-0" style={{ width: 90 }} />
            <div className="flex-1 flex items-center justify-between px-0.5">
              <span className="text-[10px] text-muted-foreground/60">
                REF biased
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                ALT biased
              </span>
            </div>
            <div className="w-12 shrink-0" />
          </div>

          {/* Dot plot rows */}
          {rows.map((row, idx) => {
            const ratio = row.ref_allele_ratio!;
            const pct = ratio * 100;
            const color = getMarkColor(row.mark);
            const dotSize = row.is_significant ? 12 : 8;
            const markLabel = shortMarkLabel(row.mark);

            return (
              <Tooltip key={`${row.tissue_name}-${row.mark}-${idx}`}>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center group cursor-default"
                    style={{ height: 24 }}
                  >
                    {/* Left label */}
                    <span
                      className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate shrink-0 text-right pr-2"
                      style={{ width: 90 }}
                      title={`${markLabel} · ${formatTissueName(row.tissue_name)}`}
                    >
                      {markLabel} &middot; {formatTissueName(row.tissue_name)}
                    </span>

                    {/* Dot plot area */}
                    <div className="flex-1 relative" style={{ height: 24 }}>
                      {/* Center dashed line at 0.5 */}
                      <div
                        className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-border"
                        style={{ transform: "translateX(-0.5px)" }}
                      />

                      {/* Leader line from 0.5 to dot */}
                      <div
                        className="absolute top-1/2 border-t border-muted-foreground/30"
                        style={{
                          left: ratio < 0.5 ? `${pct}%` : "50%",
                          width: `${Math.abs(ratio - 0.5) * 100}%`,
                          transform: "translateY(-0.5px)",
                        }}
                      />

                      {/* Dot */}
                      <div
                        className="absolute top-1/2 rounded-full transition-transform group-hover:scale-125"
                        style={{
                          left: `${pct}%`,
                          width: dotSize,
                          height: dotSize,
                          backgroundColor: color,
                          transform: "translate(-50%, -50%)",
                        }}
                      />

                      {/* Bias direction indicator */}
                      {row.ref_biased && (
                        <span
                          className="absolute top-1/2 text-[9px] text-muted-foreground/50 select-none"
                          style={{
                            left: `${pct}%`,
                            transform: "translate(-130%, -50%)",
                          }}
                        >
                          ◂
                        </span>
                      )}
                      {row.alt_biased && (
                        <span
                          className="absolute top-1/2 text-[9px] text-muted-foreground/50 select-none"
                          style={{
                            left: `${pct}%`,
                            transform: "translate(80%, -50%)",
                          }}
                        >
                          ▸
                        </span>
                      )}
                    </div>

                    {/* Right: neglog_pvalue */}
                    <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0 text-right">
                      {row.neglog_pvalue.toFixed(1)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs leading-relaxed">
                  <div>
                    <span className="font-medium">Mark:</span> {markLabel}
                  </div>
                  <div>
                    <span className="font-medium">Tissue:</span>{" "}
                    {formatTissueName(row.tissue_name)}
                  </div>
                  <div>
                    <span className="font-medium">Ref ratio:</span>{" "}
                    {ratio.toFixed(3)}
                  </div>
                  <div>
                    <span className="font-medium">-log₁₀(p):</span>{" "}
                    {row.neglog_pvalue.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Significant:</span>{" "}
                    {row.is_significant ? "Yes" : "No"}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* X-axis */}
          <div className="flex items-start" style={{ paddingTop: 4 }}>
            <div className="shrink-0" style={{ width: 90 }} />
            <div className="flex-1 relative" style={{ height: 20 }}>
              <div className="absolute top-0 left-0 right-0 border-t border-border" />
              {/* 0 */}
              <div className="absolute left-0 top-0">
                <div className="border-l border-border" style={{ height: 4 }} />
                <span className="text-[10px] tabular-nums text-muted-foreground absolute" style={{ transform: "translateX(-30%)", top: 5 }}>
                  0
                </span>
              </div>
              {/* 0.5 */}
              <div className="absolute left-1/2 top-0" style={{ transform: "translateX(-0.5px)" }}>
                <div className="border-l border-border" style={{ height: 4 }} />
                <span className="text-[10px] tabular-nums text-muted-foreground absolute" style={{ transform: "translateX(-50%)", top: 5 }}>
                  0.5
                </span>
              </div>
              {/* 1.0 */}
              <div className="absolute right-0 top-0">
                <div className="border-l border-border" style={{ height: 4 }} />
                <span className="text-[10px] tabular-nums text-muted-foreground absolute" style={{ transform: "translateX(-70%)", top: 5 }}>
                  1.0
                </span>
              </div>
            </div>
            <div className="w-12 shrink-0" />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-3">
            {uniqueMarks.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: color,
                  }}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<VariantAllelicImbalanceRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => <VariantCell vcf={row.original.variant_vcf} position={row.original.position} />,
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: true,
    meta: { description: "Tissue or cell type where allelic imbalance was measured" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "mark",
    accessorKey: "mark",
    header: "Mark",
    enableSorting: false,
    meta: { description: "Histone modification or assay mark (e.g. H3K27ac, H3K4me3)" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const raw = getValue() as string;
      return (
        <span className="text-xs text-muted-foreground" title={raw}>
          {shortMarkLabel(raw)}
        </span>
      );
    },
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "-log\u2081\u2080(p)",
    enableSorting: true,
    meta: { description: "Negative log10 p-value for allelic imbalance. Higher = stronger evidence." } satisfies ColumnMeta,
    cell: ({ row }) => {
      const val = row.original.neglog_pvalue;
      const maxBar = 10;
      const pct = Math.min(Math.max(val, 0) / maxBar, 1) * 100;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(pct, 1)}%`,
                opacity: Math.max(0.3, pct / 100),
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground">
            {val > 0 ? val.toFixed(2) : "0"}
          </span>
        </div>
      );
    },
  },
  {
    id: "p_value",
    header: "p-value",
    enableSorting: false,
    meta: { description: "Raw p-value for allelic imbalance test" } satisfies ColumnMeta,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatPvalue(row.original.neglog_pvalue)}
      </span>
    ),
  },
  {
    id: "imbalance_magnitude",
    accessorKey: "imbalance_magnitude",
    header: "Magnitude",
    enableSorting: true,
    meta: { description: "Effect size of allelic imbalance" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <span className="text-xs tabular-nums text-foreground">
          {v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "ref_allele_ratio",
    accessorKey: "ref_allele_ratio",
    header: "Ref Ratio",
    enableSorting: false,
    meta: { description: "Reference allele read ratio. 0.5 = balanced. <0.5 = ALT biased, >0.5 = REF biased." } satisfies ColumnMeta,
    cell: ({ getValue, row }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      const altB = row.original.alt_biased;
      const refB = row.original.ref_biased;
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
            <div
              className="absolute top-0 bottom-0 rounded-full bg-primary"
              style={{
                left: v < 0.5 ? `${v * 100}%` : '50%',
                width: `${Math.abs(v - 0.5) * 100}%`,
              }}
            />
          </div>
          <span className={cn("text-xs tabular-nums", altB ? "text-amber-600" : refB ? "text-blue-600" : "text-muted-foreground")}>
            {v.toFixed(2)}
          </span>
        </div>
      );
    },
  },
  {
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
    meta: { description: "Whether the allelic imbalance passes significance threshold" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className={getValue() ? "text-emerald-600 text-xs font-medium" : "text-muted-foreground/40 text-xs"}>
        {getValue() ? "Yes" : "No"}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(
  tissues: string[],
  marks: string[],
): ServerFilterConfig[] {
  return [
    tissueGroupFilter(),
    tissueFilter(tissues),
    {
      id: "mark",
      label: "Mark",
      type: "select",
      placeholder: "All marks",
      options: marks.map((m) => ({ value: m, label: shortMarkLabel(m) })),
    },
    significantOnlyFilter(),
  ];
}

// ---------------------------------------------------------------------------
// Tissue group config
// ---------------------------------------------------------------------------

const ALLELIC_IMBALANCE_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best \u2212log\u2081\u2080(p)",
  metricDescription: "Strongest allelic imbalance significance across all histone marks in this tissue group",
  countLabel: "Observations",
  formatMetric: (v) => v.toFixed(1),
  sqrtScale: true,
  showSignificant: true,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AllelicImbalanceViewProps {
  ref_id: string;
  tissues: string[];
  marks: string[];
  totalCount: number;
  initialData?: PaginatedResponse<VariantAllelicImbalanceRow>;
  groupedData?: TissueGroupRow[];
}

export function AllelicImbalanceView({
  ref_id,
  tissues,
  marks,
  totalCount,
  initialData,
  groupedData,
}: AllelicImbalanceViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={ALLELIC_IMBALANCE_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total observations`}
      />
    );
  }

  return (
    <AllelicImbalanceDetailView
      ref_id={ref_id}
      tissues={tissues}
      marks={marks}
      totalCount={totalCount}
      initialData={initialData}
    />
  );
}

function AllelicImbalanceDetailView({
  ref_id,
  tissues,
  marks,
  totalCount,
  initialData,
}: Omit<AllelicImbalanceViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useAllelicImbalanceQuery({
    ref: ref_id,
    initialData,
  });

  const filters = useMemo(
    () => buildFilters(tissues, marks),
    [tissues, marks],
  );

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") ||
    searchParams.get("tissue_group") ||
    searchParams.get("mark") ||
    searchParams.get("significant_only"),
  );
  const liveTotal =
    pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters,
    serverPagination: true,
    paginationInfo,
  });

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} observations — ENTEx histone allelic imbalance`
      : "ENTEx histone allelic imbalance across tissues";

  return (
    <div className="space-y-4">
      <TissueGroupBackButton />
      <AllelicRatioChart data={data} />
      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`allelic-imbalance-${ref_id}`}
        filterable
        filters={filters}
        filterValues={tableState.filterValues}
        onFilterChange={tableState.onFilterChange}
        filterChips={tableState.filterChips}
        onRemoveFilterChip={tableState.onRemoveFilterChip}
        onClearFilters={tableState.onClearFilters}
        loading={isLoading && data.length === 0}
        transitioning={isFetching && data.length > 0}
        serverPagination={tableState.pagination}
        serverSort={tableState.serverSort}
        pageSizeOptions={[25, 50, 100]}
        emptyMessage="No allelic imbalance data found for this variant"
      />
    </div>
  );
}
