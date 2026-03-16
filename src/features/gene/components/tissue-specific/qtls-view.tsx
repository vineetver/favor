"use client";

import Link from "next/link";
import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo } from "react";
import type { QtlRow, PaginatedResponse } from "@features/gene/api/region";
import { useQtlsQuery } from "@features/gene/hooks/use-qtls-query";
import { TISSUE_GROUPS } from "@shared/utils/tissue-format";

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
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => (
      <div>
        <Link
          href={`/hg38/variant/${encodeURIComponent(row.original.variant_vcf)}`}
          className="font-mono text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.variant_vcf}
        </Link>
        {row.original.position != null && (
          <span className="block text-[10px] tabular-nums text-muted-foreground">
            pos {row.original.position.toLocaleString()}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "source",
    accessorKey: "source",
    header: "Source",
    enableSorting: false,
    meta: {
      description:
        "QTL study source. GTEx = bulk tissue eQTLs, sQTL = splice QTLs, eQTL Catalogue = meta-analysis, sc_eqtl = single-cell",
    } satisfies ColumnMeta,
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
    meta: {
      description: "Target gene whose expression is affected by this QTL",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const gene = getValue() as string | null;
      if (!gene)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-sm font-medium text-foreground">{gene}</span>
      );
    },
  },
  {
    id: "tissue_name",
    accessorKey: "tissue_name",
    header: "Tissue",
    enableSorting: false,
    meta: {
      description: "Tissue where this QTL association was detected",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
        {getValue() as string}
      </span>
    ),
  },
  {
    id: "tss_distance",
    accessorKey: "tss_distance",
    header: "TSS Dist.",
    enableSorting: false,
    meta: { description: "Distance from variant to the transcription start site of the target gene" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <span className="text-muted-foreground/40">&mdash;</span>;
      const abs = Math.abs(v);
      const label = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)} Mb` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)} kb` : `${abs} bp`;
      return <span className="text-xs tabular-nums text-muted-foreground">{label}</span>;
    },
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "\u2212log\u2081\u2080(p)",
    enableSorting: false,
    meta: {
      description:
        "Statistical significance. Higher = stronger evidence. >5 is genome-wide significant for most QTL studies.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null)
        return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{
                width: `${Math.min((v / 20) * 100, 100)}%`,
                opacity: Math.max(0.4, Math.min(v / 20, 1)),
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground">
            {v.toFixed(1)}
          </span>
        </div>
      );
    },
  },
  {
    id: "effect_size",
    accessorKey: "effect_size",
    header: "Effect",
    enableSorting: false,
    meta: {
      description:
        "Effect size (beta). Positive = variant increases expression, negative = decreases. Magnitude indicates strength.",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null)
        return <span className="text-muted-foreground/40">&mdash;</span>;
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
  {
    id: "is_significant",
    accessorKey: "is_significant",
    header: "Sig.",
    enableSorting: false,
    meta: {
      description:
        "Passes significance threshold for this source (varies by study)",
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

const QTL_SOURCES = [
  "gtex",
  "gtex_susie",
  "sqtl",
  "apaqtl",
  "eqtl_catalogue",
  "sc_eqtl",
  "eqtl_ccre",
];

function buildFilters(genes: string[]): ServerFilterConfig[] {
  return [
    {
      id: "tissue_group",
      label: "Tissue Group",
      type: "select",
      placeholder: "All groups",
      options: TISSUE_GROUPS.map((g) => ({ value: g, label: g })),
    },
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
  genes: string[];
  initialData?: PaginatedResponse<QtlRow>;
}

export function QtlsView({
  loc,
  totalCount,
  genes,
  initialData,
}: QtlsViewProps) {
  const searchParams = useClientSearchParams();
  const filters = useMemo(() => buildFilters(genes), [genes]);

  const { data, pageInfo, isLoading, isFetching } = useQtlsQuery({
    ref: loc,
    initialData,
  });

  const hasActiveFilters = Boolean(
    searchParams.get("source") ||
      searchParams.get("gene") ||
      searchParams.get("tissue_group") ||
      searchParams.get("significant_only")
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
      ? `${liveTotal.toLocaleString()} QTL associations from 7 sources`
      : "QTL associations from 7 sources (GTEx, eQTL Catalogue, single-cell, etc.)";

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
