"use client";

import type {
  MethylationRow,
  PaginatedResponse,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useMethylationQuery } from "@features/enrichment/hooks/use-methylation-query";
import { cn } from "@infra/utils";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import { VariantCell } from "@shared/components/ui/variant-cell";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useClientSearchParams, useServerTable } from "@shared/hooks";
import { formatPvalue, formatTissueName } from "@shared/utils/tissue-format";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  significantOnlyFilter,
  tissueFilter,
  tissueGroupFilter,
} from "./filter-helpers";
import { TissueGroupBackButton } from "./tissue-group-back-button";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupSummary } from "./tissue-group-summary";

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<MethylationRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: {
      description: "Variant in VCF notation (chr-pos-ref-alt)",
    } satisfies ColumnMeta,
    cell: ({ row }) => (
      <VariantCell
        vcf={row.original.variant_vcf}
        position={row.original.position}
      />
    ),
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: true,
    meta: {
      description: "Tissue or cell type where methylation was measured",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
        {formatTissueName(getValue() as string)}
      </span>
    ),
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "-log\u2081\u2080(p)",
    enableSorting: true,
    meta: {
      description:
        "Negative log10 p-value for differential methylation. Higher = stronger evidence.",
    } satisfies ColumnMeta,
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
    meta: {
      description: "Raw p-value for differential methylation test",
    } satisfies ColumnMeta,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {formatPvalue(row.original.neglog_pvalue)}
      </span>
    ),
  },
  {
    id: "methylation_diff",
    accessorKey: "methylation_diff",
    header: "Meth. Diff",
    enableSorting: true,
    meta: {
      description:
        "Difference in methylation between alleles. Positive = ref allele hypermethylated.",
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
                : "text-muted-foreground",
          )}
        >
          {v > 0 ? "+" : ""}
          {v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "methylation_allele1",
    accessorKey: "methylation_allele1",
    header: "Allele 1",
    enableSorting: false,
    meta: {
      description: "Methylation level for allele 1 (reference)",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "methylation_allele2",
    accessorKey: "methylation_allele2",
    header: "Allele 2",
    enableSorting: false,
    meta: {
      description: "Methylation level for allele 2 (alternate)",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
    meta: {
      description:
        "Whether differential methylation passes significance threshold",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span
        className={
          getValue()
            ? "text-emerald-600 text-xs font-medium"
            : "text-muted-foreground/40 text-xs"
        }
      >
        {getValue() ? "Yes" : "No"}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

function buildFilters(tissues: string[]): ServerFilterConfig[] {
  return [tissueGroupFilter(), tissueFilter(tissues), significantOnlyFilter()];
}

// ---------------------------------------------------------------------------
// Tissue group config
// ---------------------------------------------------------------------------

const METHYLATION_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best \u2212log\u2081\u2080(p)",
  metricDescription:
    "Strongest differential methylation significance in this tissue group",
  countLabel: "Observations",
  formatMetric: (v) => v.toFixed(1),
  sqrtScale: true,
  showSignificant: true,
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MethylationViewProps {
  ref_id: string;
  tissues: string[];
  totalCount: number;
  initialData?: PaginatedResponse<MethylationRow>;
  groupedData?: TissueGroupRow[];
}

export function MethylationView({
  ref_id,
  tissues,
  totalCount,
  initialData,
  groupedData,
}: MethylationViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={METHYLATION_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total observations`}
      />
    );
  }

  return (
    <MethylationDetailView
      ref_id={ref_id}
      tissues={tissues}
      totalCount={totalCount}
      initialData={initialData}
    />
  );
}

function MethylationDetailView({
  ref_id,
  tissues,
  totalCount,
  initialData,
}: Omit<MethylationViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useMethylationQuery({
    ref: ref_id,
    initialData,
  });

  const filters = useMemo(() => buildFilters(tissues), [tissues]);

  const hasActiveFilters = Boolean(
    searchParams.get("tissue") ||
      searchParams.get("tissue_group") ||
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
      ? `${liveTotal.toLocaleString()} observations — allele-specific DNA methylation`
      : "Allele-specific DNA methylation across tissues";

  return (
    <>
      <TissueGroupBackButton />
      <DataSurface
        data={data}
        columns={columns}
        subtitle={subtitle}
        searchPlaceholder="Search tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`methylation-${ref_id}`}
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
        emptyMessage="No methylation data found for this variant"
      />
    </>
  );
}
