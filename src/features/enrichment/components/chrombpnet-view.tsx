"use client";

import type {
  ChromBpnetRow,
  PaginatedResponse,
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useChromBpnetQuery } from "@features/enrichment/hooks/use-chrombpnet-query";
import { cn } from "@infra/utils";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import { EntityLink } from "@shared/components/ui/entity-link";
import { VariantCell } from "@shared/components/ui/variant-cell";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useClientSearchParams, useServerTable } from "@shared/hooks";
import { formatTissueName } from "@shared/utils/tissue-format";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { tissueGroupFilter } from "./filter-helpers";
import { TissueGroupBackButton } from "./tissue-group-back-button";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupSummary } from "./tissue-group-summary";

// ---------------------------------------------------------------------------
// Columns — ChromBPNet: bias-factorized deep learning model predicting
// base-resolution chromatin accessibility (Kundaje lab, ENCODE).
// ---------------------------------------------------------------------------

const columns: ColumnDef<ChromBpnetRow, unknown>[] = [
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
    header: "Biosample",
    enableSorting: false,
    meta: {
      description:
        "Cell type or tissue. Currently HepG2 (hepatocellular carcinoma cell line) and primary liver from 5 ENCODE experiments.",
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
    cell: ({ getValue }) => {
      const v = getValue() as string | undefined;
      if (!v) return <Dash />;
      return <span className="text-xs text-muted-foreground">{v}</span>;
    },
  },
  {
    id: "combined_score",
    accessorKey: "combined_score",
    header: "Combined",
    enableSorting: true,
    meta: {
      description:
        "|log\u2082FC| \u00d7 JSD integrated variant effect score. Captures both magnitude and profile-shape changes. Higher = stronger predicted disruption of chromatin accessibility.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className="text-xs tabular-nums text-foreground font-medium">
          {v.toExponential(2)}
        </span>
      );
    },
  },
  {
    id: "combined_pval",
    accessorKey: "combined_pval",
    header: "p-value",
    enableSorting: true,
    meta: {
      description:
        "Empirical p-value for combined score vs null (shuffled) variants. <0.05 = statistically significant predicted effect.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      const sig = v < 0.05;
      return (
        <span
          className={cn(
            "text-xs tabular-nums",
            sig ? "text-foreground font-medium" : "text-muted-foreground",
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
    header: "log\u2082FC",
    enableSorting: true,
    meta: {
      description:
        "Predicted log\u2082 fold-change in chromatin accessibility (ref\u2192alt). Positive = variant opens chromatin, negative = closes. Quantifies relative change at the variant site.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
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
    id: "jsd_mean",
    accessorKey: "jsd_mean",
    header: "JSD",
    enableSorting: false,
    meta: {
      description:
        "Jensen-Shannon divergence between ref and alt predicted accessibility profiles. Captures profile-shape effects beyond single-position changes. Range: 0 (identical) to 1 (maximally different).",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {v.toFixed(4)}
        </span>
      );
    },
  },
  {
    id: "closest_gene_1",
    accessorKey: "closest_gene_1",
    header: "Nearest Gene",
    enableSorting: false,
    meta: {
      description: "Closest gene to this variant and distance in bp",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const gene = row.original.closest_gene_1;
      const dist = row.original.gene_distance_1;
      if (!gene) return <Dash />;
      const distLabel =
        dist != null && dist > 0
          ? ` (${dist >= 1000 ? `${(dist / 1000).toFixed(1)}kb` : `${dist}bp`})`
          : "";
      return (
        <span className="text-xs">
          <EntityLink
            type="genes"
            id={gene}
            stopPropagation
            className="text-primary hover:underline"
          >
            {gene}
          </EntityLink>
          {distLabel}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const CHROMBPNET_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best Combined",
  metricDescription:
    "Strongest combined variant effect score (|log\u2082FC| \u00d7 JSD) in this tissue group",
  countLabel: "Predictions",
  formatMetric: (v) => v.toExponential(2),
};

interface ChromBpnetViewProps {
  loc: string;
  totalCount: number;
  initialData?: PaginatedResponse<ChromBpnetRow>;
  groupedData?: TissueGroupRow[];
}

export function ChromBpnetView({
  loc,
  totalCount,
  initialData,
  groupedData,
}: ChromBpnetViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={CHROMBPNET_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups \u00b7 ${totalCount.toLocaleString()} total predictions`}
      />
    );
  }

  return (
    <ChromBpnetDetailView
      loc={loc}
      totalCount={totalCount}
      initialData={initialData}
    />
  );
}

function ChromBpnetDetailView({
  loc,
  totalCount,
  initialData,
}: Omit<ChromBpnetViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();
  const { data, pageInfo, isLoading, isFetching } = useChromBpnetQuery({
    ref: loc,
    initialData,
  });

  const filterConfigs = useMemo(
    (): ServerFilterConfig[] => [tissueGroupFilter()],
    [],
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
      ? `${liveTotal.toLocaleString()} variant effect predictions (ChromBPNet, Kundaje lab)`
      : "Bias-factorized deep learning predictions of variant effects on chromatin accessibility";

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
    </>
  );
}
