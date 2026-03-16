"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
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
} from "@features/enrichment/api/region";
import { useAllelicImbalanceQuery } from "@features/enrichment/hooks/use-allelic-imbalance-query";

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
  tissueGroups: string[],
): ServerFilterConfig[] {
  return [
    tissueGroupFilter(tissueGroups),
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
// Main component
// ---------------------------------------------------------------------------

interface AllelicImbalanceViewProps {
  ref_id: string;
  tissues: string[];
  marks: string[];
  totalCount: number;
  initialData?: PaginatedResponse<VariantAllelicImbalanceRow>;
}

export function AllelicImbalanceView({
  ref_id,
  tissues,
  marks,
  totalCount,
  initialData,
}: AllelicImbalanceViewProps) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useAllelicImbalanceQuery({
    ref: ref_id,
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
    () => buildFilters(tissues, marks, tissueGroups),
    [tissues, marks, tissueGroups],
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
  );
}
