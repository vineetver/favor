"use client";

import { cn } from "@infra/utils";
import { formatTissueName } from "@shared/utils/tissue-format";
import { DataSurface } from "@shared/components/ui/data-surface";
import type {
  ServerFilterConfig,
  ServerPaginationInfo,
} from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { RegionSummary, TissueGroupRow } from "@features/enrichment/api/region";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SignalRow, PaginatedResponse } from "@features/enrichment/api/region";
import { useSignalsQuery } from "@features/enrichment/hooks/use-signals-query";
import { tissueFilter } from "./filter-helpers";
import { CcreDetailSheet } from "./ccre-detail-sheet";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const SIGNALS_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Max Z-score",
  metricDescription: "Strongest epigenomic signal Z-score across all cCREs in this tissue group",
  countLabel: "cCREs",
  formatMetric: (v) => v.toFixed(1),
  showTopItem: true,
  topItemLabel: "Top cCRE",
};

interface TissueSignalsViewProps {
  loc: string;
  totalSignals: number;
  tissues: string[];
  classifications: string[];
  initialData?: PaginatedResponse<SignalRow>;
  serverFilters?: Record<string, string>;
  summary?: RegionSummary | null;
  basePath?: string;
  groupedData?: TissueGroupRow[];
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(
  tissues: string[],
  classifications: string[],
): ServerFilterConfig[] {
  return [
    tissueFilter(tissues, { label: "Tissue", format: false }),
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
    meta: { description: "ENCODE candidate cis-Regulatory Element accession" } satisfies ColumnMeta,
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
    header: "Biosample",
    meta: { description: "Specific biosample within the tissue group" } satisfies ColumnMeta,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block" title={row.original.subtissue_name || row.original.tissue_name}>
        {formatTissueName(row.original.subtissue_name || row.original.tissue_name)}
      </span>
    ),
  },
  {
    id: "ccre_classification",
    accessorKey: "ccre_classification",
    header: "Class",
    meta: { description: "PLS (promoter-like), pELS/dELS (enhancer-like), CTCF-only, DNase-H3K4me3" } satisfies ColumnMeta,
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
        DNase Z
      </div>
    ),
    meta: { description: "DNase-seq signal Z-score \u2014 chromatin accessibility" } satisfies ColumnMeta,
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
        ATAC Z
      </div>
    ),
    meta: { description: "ATAC-seq signal Z-score \u2014 chromatin accessibility" } satisfies ColumnMeta,
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
        CTCF Z
      </div>
    ),
    meta: { description: "CTCF ChIP-seq Z-score \u2014 insulator binding" } satisfies ColumnMeta,
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
        H3K27ac Z
      </div>
    ),
    meta: { description: "H3K27ac ChIP-seq Z-score \u2014 active enhancer/promoter mark" } satisfies ColumnMeta,
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
        H3K4me3 Z
      </div>
    ),
    meta: { description: "H3K4me3 ChIP-seq Z-score \u2014 active promoter mark" } satisfies ColumnMeta,
    enableSorting: false,
    cell: ({ getValue }) => (
      <SignalCell value={getValue() as number | null} />
    ),
  },
  {
    // ID matches API sort_by value
    id: "max_signal",
    accessorKey: "max_signal",
    header: "Max Z",
    meta: { description: "Maximum Z-score across all available assays for this biosample" } satisfies ColumnMeta,
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
  summary,
  basePath,
  groupedData,
}: TissueSignalsViewProps) {
  const searchParams0 = useClientSearchParams();
  const activeTissueGroup = searchParams0.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={SIGNALS_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalSignals.toLocaleString()} total cCRE measurements`}
      />
    );
  }

  return (
    <TissueSignalsDetailView
      loc={loc}
      totalSignals={totalSignals}
      tissues={tissues}
      classifications={classifications}
      initialData={initialData}
      serverFilters={serverFilters}
      summary={summary}
      basePath={basePath}
    />
  );
}

function TissueSignalsDetailView({
  loc,
  totalSignals,
  tissues,
  classifications,
  initialData,
  serverFilters = {},
  summary,
  basePath,
}: Omit<TissueSignalsViewProps, "groupedData">) {
  const filters = useMemo(
    () => buildFilters(tissues, classifications),
    [tissues, classifications],
  );

  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching, prefetchNext } =
    useSignalsQuery({ loc, initialData });

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") || searchParams.get("tissue_group") || searchParams.get("ccre_class"),
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

  // cCRE detail sheet
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openCcreSheet = useCallback((ccreId: string) => {
    setSelectedCcre(ccreId);
    setSheetOpen(true);
  }, []);

  // Override cCRE column to be clickable
  const columnsWithSheet = useMemo(() => {
    return signalColumns.map((col) => {
      if (col.id === "ccre_id") {
        return {
          ...col,
          cell: ({ getValue }: { getValue: () => unknown }) => {
            const id = getValue() as string;
            return (
              <button
                className="font-mono text-xs text-primary hover:underline cursor-pointer"
                onClick={() => openCcreSheet(id)}
              >
                {id}
              </button>
            );
          },
        };
      }
      return col;
    });
  }, [openCcreSheet]);

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} cCRE activity measurements across ${tissues.length} biosamples`
      : `cCRE activity measurements across ${tissues.length} biosamples`;

  return (
    <>
      <TissueGroupBackButton />
      <DataSurface
        data={data}
        columns={columnsWithSheet}
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

      <CcreDetailSheet
        ccreId={selectedCcre}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
