"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { QtlRow, PaginatedResponse } from "@features/gene/api/region";
import { useQtlsQuery } from "@features/gene/hooks/use-qtls-query";

// ---------------------------------------------------------------------------
// Source labels
// ---------------------------------------------------------------------------

const SOURCE_LABELS: Record<string, string> = {
  gtex: "GTEx eQTL",
  gtex_susie: "GTEx fine-mapped",
  sqtl: "GTEx sQTL",
  apaqtl: "APA QTL",
  eqtl_catalogue: "eQTL Catalogue",
  sc_eqtl: "Single-cell eQTL",
  eqtl_ccre: "eQTL-cCRE",
};

function sourceLabel(raw: string): string {
  return SOURCE_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<QtlRow, unknown>[] = [
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    enableSorting: false,
    meta: { description: "QTL study source (GTEx, eQTL Catalogue, etc.)" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">
        {sourceLabel(getValue() as string)}
      </span>
    ),
  },
  {
    id: "gene_symbol",
    accessorKey: "gene_symbol",
    header: "Gene",
    enableSorting: false,
    meta: { description: "Target gene affected by this QTL" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const gene = getValue() as string | null;
      if (!gene) return <span className="text-muted-foreground/40">&mdash;</span>;
      return <span className="text-sm font-medium text-foreground">{gene}</span>;
    },
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    meta: { description: "Tissue where this QTL association was detected" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "-log\u2081\u2080(p)",
    enableSorting: false,
    meta: { description: "Statistical significance of the QTL association" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs tabular-nums text-foreground">
          {v.toFixed(1)}
        </span>
      );
    },
  },
  {
    id: "effect_size",
    accessorKey: "effect_size",
    header: "Effect",
    enableSorting: false,
    meta: { description: "Effect size (beta) — magnitude and direction of gene expression change" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className={cn(
          "text-xs tabular-nums",
          v > 0 ? "text-emerald-600" : v < 0 ? "text-destructive" : "text-muted-foreground",
        )}>
          {v > 0 ? "+" : ""}{v.toFixed(3)}
        </span>
      );
    },
  },
  {
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
    meta: { description: "Passes significance threshold for this source" } satisfies ColumnMeta,
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

const QTL_SOURCES = ["gtex", "gtex_susie", "sqtl", "apaqtl", "eqtl_catalogue", "sc_eqtl", "eqtl_ccre"];

function buildFilters(tissues: string[], genes: string[]): ServerFilterConfig[] {
  return [
    {
      id: "source",
      label: "Source",
      type: "select",
      placeholder: "All sources",
      options: QTL_SOURCES.map((s) => ({ value: s, label: sourceLabel(s) })),
    },
    {
      id: "gene",
      label: "Gene",
      type: "select",
      placeholder: "All genes",
      options: genes.map((g) => ({ value: g, label: g })),
    },
    {
      id: "significant_only",
      label: "Significant",
      type: "select",
      placeholder: "All",
      options: [{ value: "true", label: "Significant only" }],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface QtlsViewProps {
  loc: string;
  totalCount: number;
  initialData?: PaginatedResponse<QtlRow>;
}

export function QtlsView({ loc, totalCount, initialData }: QtlsViewProps) {
  const searchParams = useClientSearchParams();

  const { data, pageInfo, isLoading, isFetching } = useQtlsQuery({
    ref: loc,
    initialData,
  });

  // Derive filter options from current data
  const genes = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) {
      if (row.gene_symbol) s.add(row.gene_symbol);
    }
    return [...s].sort();
  }, [data]);

  const tissues = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) {
      if (row.tissue_name) s.add(row.tissue_name);
    }
    return [...s].sort();
  }, [data]);

  const filters = useMemo(() => buildFilters(tissues, genes), [tissues, genes]);

  const hasActiveFilters = Boolean(
    searchParams.get("source") || searchParams.get("gene") || searchParams.get("significant_only"),
  );
  const liveTotal = pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

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

  const subtitle = liveTotal != null
    ? `${liveTotal.toLocaleString()} QTL associations across 7 sources`
    : "QTL associations across 7 sources";

  return (
    <DataSurface
      data={data}
      columns={columns}
      subtitle={subtitle}
      searchPlaceholder="Search genes, tissues..."
      searchColumn="gene_symbol"
      exportable
      exportFilename={`qtls-${loc}`}
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
      emptyMessage="No QTL associations found for variants in this region"
    />
  );
}
