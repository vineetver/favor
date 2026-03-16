"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import type {
  ServerFilterConfig,
  ServerPaginationInfo,
} from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo } from "react";
import type { SignalRow, PaginatedResponse } from "@features/gene/api/region";
import { useSignalsQuery } from "@features/gene/hooks/use-signals-query";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TissueSignalsViewProps {
  loc: string;
  totalSignals: number;
  tissues: string[];
  classifications: string[];
  initialData?: PaginatedResponse<SignalRow>;
  serverFilters?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(
  tissues: string[],
  classifications: string[],
): ServerFilterConfig[] {
  return [
    {
      id: "tissue",
      label: "Tissue",
      type: "select",
      placeholder: "All tissues",
      options: tissues.map((t) => ({ value: t, label: t })),
    },
    {
      id: "ccre_class",
      label: "Classification",
      type: "select",
      placeholder: "All classes",
      options: classifications.map((c) => ({ value: c, label: c })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Signal cell renderer
// ---------------------------------------------------------------------------

const MARK_COLORS: Record<string, string> = {
  dnase: "bg-blue-500",
  atac: "bg-emerald-500",
  ctcf: "bg-amber-500",
  h3k27ac: "bg-violet-500",
  h3k4me3: "bg-rose-500",
};

function SignalCell({ value }: { value: number | null }) {
  if (value == null)
    return <span className="text-muted-foreground/40">&mdash;</span>;
  return (
    <span className="text-sm tabular-nums text-foreground">
      {value.toFixed(2)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Columns — tissue_name and max_signal are server-sortable (IDs match API)
// ---------------------------------------------------------------------------

const signalColumns: ColumnDef<SignalRow, unknown>[] = [
  {
    id: "ccre_id",
    accessorKey: "ccre_id",
    header: "cCRE",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-foreground">
        {getValue() as string}
      </span>
    ),
  },
  {
    // ID matches API sort_by value
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[160px] block">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "ccre_classification",
    accessorKey: "ccre_classification",
    header: "Class",
    enableSorting: false,
    cell: ({ getValue }) => {
      const val = getValue() as string;
      return (
        <span className="text-xs text-muted-foreground">{val || "&mdash;"}</span>
      );
    },
  },
  {
    id: "dnase",
    accessorKey: "dnase",
    header: () => (
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", MARK_COLORS.dnase)} />
        DNase
      </div>
    ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    id: "atac",
    accessorKey: "atac",
    header: () => (
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", MARK_COLORS.atac)} />
        ATAC
      </div>
    ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    id: "ctcf",
    accessorKey: "ctcf",
    header: () => (
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", MARK_COLORS.ctcf)} />
        CTCF
      </div>
    ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    id: "h3k27ac",
    accessorKey: "h3k27ac",
    header: () => (
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", MARK_COLORS.h3k27ac)} />
        H3K27ac
      </div>
    ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    id: "h3k4me3",
    accessorKey: "h3k4me3",
    header: () => (
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", MARK_COLORS.h3k4me3)} />
        H3K4me3
      </div>
    ),
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    // ID matches API sort_by value
    id: "max_signal",
    accessorKey: "max_signal",
    header: "Max Signal",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm font-medium tabular-nums text-foreground">
        {(getValue() as number).toFixed(2)}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TissueSignalsView({
  loc,
  totalSignals,
  tissues,
  classifications,
  initialData,
  serverFilters = {},
}: TissueSignalsViewProps) {
  const filters = useMemo(
    () => buildFilters(tissues, classifications),
    [tissues, classifications],
  );

  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching, prefetchNext } =
    useSignalsQuery({ loc, initialData });

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") || searchParams.get("ccre_class"),
  );

  const liveTotal =
    pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalSignals);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters,
    serverFilters,
    debounceDelay: 300,
    serverPagination: true,
    paginationInfo,
  });

  // Prefetch next page when current page settles
  useEffect(() => {
    if (pageInfo.hasMore && !isFetching) {
      prefetchNext();
    }
  }, [pageInfo.hasMore, isFetching, prefetchNext]);

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} cCRE signal values across ${tissues.length} tissues`
      : `cCRE signal values across ${tissues.length} tissues`;

  return (
    <DataSurface
      data={data}
      columns={signalColumns}
      subtitle={subtitle}
      searchPlaceholder="Search cCREs, tissues..."
      searchColumn="tissue_name"
      exportable
      exportFilename={`tissue-signals-${loc}`}
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
      emptyMessage="No signals found for this region"
    />
  );
}
