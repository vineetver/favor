"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type {
  ServerFilterConfig,
  ServerPaginationInfo,
} from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { tissueGroupFilter, tissueFilter } from "./filter-helpers";
import type {
  AccessibilityRow,
  PaginatedResponse,
  RegionSummary,
} from "@features/gene/api/region";
import { useAccessibilityQuery } from "@features/gene/hooks/use-accessibility-query";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { formatTissueName } from "@shared/utils/tissue-format";

// ---------------------------------------------------------------------------
// TissueSummaryChart — horizontal bar chart ranked by peak signal
// ---------------------------------------------------------------------------

interface TissueScore {
  tissue: string;
  bestSignal: number;
  peakCount: number;
}

function aggregateByTissue(rows: AccessibilityRow[]): TissueScore[] {
  const map = new Map<string, { best: number; count: number }>();
  for (const row of rows) {
    const existing = map.get(row.tissue_name);
    if (existing) {
      existing.best = Math.max(existing.best, row.signal_value);
      existing.count++;
    } else {
      map.set(row.tissue_name, { best: row.signal_value, count: 1 });
    }
  }
  return [...map.entries()]
    .map(([tissue, { best, count }]) => ({
      tissue,
      bestSignal: best,
      peakCount: count,
    }))
    .sort((a, b) => b.bestSignal - a.bestSignal);
}

function TissueSummaryChart({ rows }: { rows: AccessibilityRow[] }) {
  const tissueScores = useMemo(
    () => (rows.length ? aggregateByTissue(rows) : []),
    [rows],
  );

  if (!tissueScores.length) return null;

  const maxSignal = tissueScores[0].bestSignal;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">
            Top Tissues by Peak Signal
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strongest ATAC-seq / DNase signal per tissue
          </p>
        </div>

        <div className="px-4 py-3 space-y-1">
          {tissueScores.map(({ tissue, bestSignal, peakCount }) => {
            const pct =
              maxSignal > 0 ? (bestSignal / maxSignal) * 100 : 0;

            return (
              <Tooltip key={tissue}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 group cursor-default">
                    <span
                      className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate shrink-0 text-right"
                      style={{ width: 130 }}
                    >
                      {formatTissueName(tissue)}
                    </span>
                    <div className="flex-1 h-5 bg-muted/40 rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm bg-primary transition-all"
                        style={{
                          width: `${Math.max(pct, 1)}%`,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums text-muted-foreground w-12 text-right shrink-0">
                      {bestSignal.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground/60 w-16 shrink-0">
                      {peakCount} peak{peakCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-sm">
                  {peakCount} peak{peakCount !== 1 ? "s" : ""} in{" "}
                  {formatTissueName(tissue)}, best signal {bestSignal.toFixed(2)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<AccessibilityRow, unknown>[] = [
  {
    id: "peak_id",
    accessorKey: "peak_id",
    header: "Peak ID",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-xs font-mono text-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "max_signal",
    accessorKey: "signal_value",
    header: "Signal",
    enableSorting: true,
    cell: ({ row }) => {
      const val = row.original.signal_value;
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(val * 10, 100)}%`,
                opacity: Math.max(0.4, Math.min(val / 10, 1)),
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground font-medium">
            {val.toFixed(2)}
          </span>
        </div>
      );
    },
  },
  {
    id: "position",
    accessorFn: (row) => row.start,
    header: "Coordinates",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {row.original.start.toLocaleString()}&ndash;
        {row.original.end.toLocaleString()}
      </span>
    ),
  },
  {
    id: "length",
    header: "Length",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {(row.original.end - row.original.start).toLocaleString()} bp
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(tissues: string[], tissueGroups: string[]): ServerFilterConfig[] {
  return [
    tissueGroupFilter(tissueGroups),
    tissueFilter(tissues),
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AccessibilityViewProps {
  loc: string;
  tissues: string[];
  totalCount: number;
  regionCoords: string;
  initialData?: PaginatedResponse<AccessibilityRow>;
  summary?: RegionSummary | null;
  basePath?: string;
}

export function AccessibilityView({
  loc,
  tissues,
  totalCount,
  regionCoords,
  initialData,
  summary,
  basePath,
}: AccessibilityViewProps) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useAccessibilityQuery({
    loc,
    initialData,
  });

  const tissueGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const row of data) {
      if (row.tissue_group) groups.add(row.tissue_group);
    }
    return [...groups].sort();
  }, [data]);

  const filters = useMemo(() => buildFilters(tissues, tissueGroups), [tissues, tissueGroups]);

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") || searchParams.get("tissue_group") || searchParams.get("min_signal"),
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

  // When filters active, show filtered data in chart; otherwise use initialData (more rows)
  const chartRows = hasActiveFilters ? data : (initialData?.data ?? data);

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} peaks across ${tissues.length} biosamples`
      : `Peaks across ${tissues.length} biosamples`;

  return (
    <div className="space-y-6">
      <TissueSummaryChart rows={chartRows} />

      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search peaks, tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`accessibility-${loc}`}
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
        emptyMessage="No accessibility peaks found for this region"
      />
    </div>
  );
}
