"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import { formatTissueName, TISSUE_GROUPS } from "@shared/utils/tissue-format";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ChromBpnetRow, PaginatedResponse } from "@features/gene/api/region";
import { useChromBpnetQuery } from "@features/gene/hooks/use-chrombpnet-query";

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<ChromBpnetRow, unknown>[] = [
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Biosample",
    enableSorting: false,
    meta: {
      description:
        "Cell type or tissue where ChromBPNet predicted the variant effect on chromatin accessibility",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "tissue_group",
    accessorKey: "tissue_group",
    header: "Group",
    enableSorting: false,
    meta: { description: "Tissue group" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      if (!v)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return <span className="text-xs text-muted-foreground">{v}</span>;
    },
  },
  {
    id: "combined_score",
    accessorKey: "combined_score",
    header: "Score",
    enableSorting: false,
    meta: {
      description:
        "ChromBPNet combined score. Higher = stronger predicted variant effect on chromatin accessibility. Based on deep learning model trained on ENCODE data.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums text-foreground font-medium">
        {(getValue() as number).toExponential(2)}
      </span>
    ),
  },
  {
    id: "combined_pval",
    accessorKey: "combined_pval",
    header: "p-value",
    enableSorting: false,
    meta: {
      description:
        "Combined p-value for the predicted chromatin effect. <0.05 = statistically significant prediction.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      const sig = v < 0.05;
      return (
        <span
          className={cn(
            "text-xs tabular-nums",
            sig ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "logfc_mean",
    accessorKey: "logfc_mean",
    header: "Log FC",
    enableSorting: false,
    meta: {
      description:
        "Mean log fold-change. Positive = variant increases chromatin accessibility, negative = decreases. Magnitude indicates effect strength.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      return (
        <span
          className={cn(
            "text-xs tabular-nums",
            v > 0
              ? "text-emerald-600"
              : v < 0
                ? "text-destructive"
                : "text-muted-foreground"
          )}
        >
          {v > 0 ? "+" : ""}
          {v.toFixed(3)}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface ChromBpnetViewProps {
  loc: string;
  totalCount: number;
  initialData?: PaginatedResponse<ChromBpnetRow>;
}

export function ChromBpnetView({
  loc,
  totalCount,
  initialData,
}: ChromBpnetViewProps) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useChromBpnetQuery({
    ref: loc,
    initialData,
  });

  const filterConfigs = useMemo(
    (): ServerFilterConfig[] => [
      {
        id: "tissue_group",
        label: "Tissue Group",
        type: "select",
        placeholder: "All groups",
        options: TISSUE_GROUPS.map((g) => ({ value: g, label: g })),
      },
    ],
    []
  );

  const hasActiveFilters = Boolean(searchParams.get("tissue_group"));
  const liveTotal =
    pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters: filterConfigs,
    serverPagination: true,
    paginationInfo,
  });

  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} ChromBPNet variant effect predictions`
      : "ChromBPNet deep learning variant effect predictions";

  return (
    <DataSurface
      data={data}
      columns={columns}
      subtitle={subtitle}
      searchPlaceholder="Search tissues..."
      searchColumn="tissue_name"
      exportable
      exportFilename={`chrombpnet-${loc}`}
      filterable
      filters={filterConfigs}
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
      emptyMessage="No ChromBPNet predictions found for variants in this region"
    />
  );
}
