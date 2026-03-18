"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import type {
  ServerFilterConfig,
  ServerPaginationInfo,
} from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import { tissueGroupFilter, tissueFilter, significantOnlyFilter } from "./filter-helpers";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import type {
  AseRow,
  PaginatedResponse,
  RegionSummary,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useAseQuery } from "@features/enrichment/hooks/use-ase-query";
import { CcreDetailSheet } from "./ccre-detail-sheet";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { formatTissueName, formatPvalue } from "@shared/utils/tissue-format";

// Clean assay names: "HM-ChIP-seq_H3K27ac" → "H3K27ac"
function shortAssayLabel(raw: string): string {
  // Strip common prefixes
  return raw
    .replace(/^HM-ChIP-seq_/, "")
    .replace(/^TF-ChIP-seq_/, "")
    .replace(/^ATAC-seq$/, "ATAC");
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<AseRow, unknown>[] = [
  {
    id: "ccre_accession",
    accessorKey: "ccre_accession",
    header: "cCRE",
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
      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "assay",
    accessorKey: "assay",
    header: "Assay",
    enableSorting: false,
    cell: ({ getValue }) => {
      const raw = getValue() as string;
      return (
        <span className="text-xs text-muted-foreground" title={raw}>
          {shortAssayLabel(raw)}
        </span>
      );
    },
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "-log\u2081\u2080(p)",
    enableSorting: true,
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
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatPvalue(row.original.neglog_pvalue)}
      </span>
    ),
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
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
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
  assays: string[],
  tissueGroups: string[],
): ServerFilterConfig[] {
  return [
    tissueGroupFilter(tissueGroups),
    tissueFilter(tissues),
    {
      id: "assay",
      label: "Assay",
      type: "select",
      placeholder: "All assays",
      options: assays.map((a) => ({ value: a, label: shortAssayLabel(a) })),
    },
    significantOnlyFilter(),
  ];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ASE_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best \u2212log\u2081\u2080(p)",
  metricDescription: "Strongest allele-specific epigenomic activity significance in this tissue group",
  countLabel: "Observations",
  formatMetric: (v) => v.toFixed(1),
  showSignificant: true,
};

interface AseViewProps {
  loc: string;
  tissues: string[];
  assays: string[];
  totalCount: number;
  initialData?: PaginatedResponse<AseRow>;
  summary?: RegionSummary | null;
  basePath?: string;
  groupedData?: TissueGroupRow[];
}

export function AseView({
  loc,
  tissues,
  assays,
  totalCount,
  initialData,
  summary,
  basePath,
  groupedData,
}: AseViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={ASE_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total observations`}
      />
    );
  }

  return (
    <AseDetailView
      loc={loc}
      tissues={tissues}
      assays={assays}
      totalCount={totalCount}
      initialData={initialData}
      summary={summary}
      basePath={basePath}
    />
  );
}

function AseDetailView({
  loc,
  tissues,
  assays,
  totalCount,
  initialData,
  summary,
  basePath,
}: Omit<AseViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useAseQuery({
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

  const filters = useMemo(
    () => buildFilters(tissues, assays, tissueGroups),
    [tissues, assays, tissueGroups],
  );

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") ||
    searchParams.get("tissue_group") ||
    searchParams.get("assay") ||
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

  // cCRE detail sheet
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openCcreSheet = useCallback((ccreId: string) => {
    setSelectedCcre(ccreId);
    setSheetOpen(true);
  }, []);

  // Override cCRE column to be clickable
  const columnsWithSheet = useMemo(() => {
    return columns.map((col) => {
      if (col.id === "ccre_accession") {
        return {
          ...col,
          cell: ({ getValue }: { getValue: () => unknown }) => {
            const id = getValue() as string;
            return (
              <button
                className="text-xs font-mono text-primary hover:underline cursor-pointer"
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
      ? `${liveTotal.toLocaleString()} observations across ${tissues.length} biosamples`
      : `Observations across ${tissues.length} biosamples`;

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
        exportFilename={`ase-${loc}`}
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
        emptyMessage="No allele-specific activity found for this region"
      />

      <CcreDetailSheet
        ccreId={selectedCcre}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
