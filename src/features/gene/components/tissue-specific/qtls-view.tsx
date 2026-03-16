"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import { Dash } from "@shared/components/ui/dash";
import { VariantCell } from "@shared/components/ui/variant-cell";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams, updateClientUrl } from "@shared/hooks";
import { tissueGroupFilter, significantOnlyFilter } from "./filter-helpers";
import type { ColumnMeta, DimensionConfig } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import type { QtlRow, PaginatedResponse } from "@features/gene/api/region";
import { useQtlsQuery } from "@features/gene/hooks/use-qtls-query";

// ---------------------------------------------------------------------------
// Source config
// ---------------------------------------------------------------------------

const QTL_SOURCES = [
  { id: "all", label: "All Sources" },
  { id: "gtex", label: "GTEx eQTL" },
  { id: "gtex_susie", label: "GTEx Fine-mapped" },
  { id: "sqtl", label: "sQTL" },
  { id: "apaqtl", label: "APA QTL" },
  { id: "eqtl_catalogue", label: "eQTL Catalogue" },
  { id: "sc_eqtl", label: "Single-cell" },
  { id: "eqtl_ccre", label: "eQTL-cCRE" },
] as const;

function sourceLabel(raw: string): string {
  return QTL_SOURCES.find((s) => s.id === raw)?.label ?? raw;
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
    cell: ({ row }) => <VariantCell vcf={row.original.variant_vcf} position={row.original.position} />,
  },
  {
    id: "gene_symbol",
    accessorKey: "gene_symbol",
    header: "Gene",
    enableSorting: false,
    meta: { description: "Target gene whose expression is affected by this QTL" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const gene = getValue() as string | null;
      if (!gene) return <Dash />;
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
    id: "tss_distance",
    accessorKey: "tss_distance",
    header: "TSS Dist.",
    enableSorting: false,
    meta: { description: "Distance from variant to the transcription start site of the target gene" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      const abs = Math.abs(v);
      const label = abs >= 1_000_000 ? `${(abs / 1_000_000).toFixed(1)} Mb` : abs >= 1_000 ? `${(abs / 1_000).toFixed(1)} kb` : `${abs} bp`;
      return <span className="text-xs tabular-nums text-muted-foreground">{label}</span>;
    },
  },
  {
    id: "neglog_pvalue",
    accessorKey: "neglog_pvalue",
    header: "\u2212log\u2081\u2080(p)",
    enableSorting: true,
    meta: { description: "Statistical significance. Higher = stronger evidence. >5 is genome-wide significant." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min((v / 20) * 100, 100)}%`, opacity: Math.max(0.4, Math.min(v / 20, 1)) }} />
          </div>
          <span className="text-xs tabular-nums text-foreground">{v.toFixed(1)}</span>
        </div>
      );
    },
  },
  {
    id: "effect_size",
    accessorKey: "effect_size",
    header: "Effect (\u03b2)",
    enableSorting: true,
    meta: { description: "Regression slope: normalized expression change per ALT allele copy. Positive = upregulation, negative = downregulation." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      if (v == null) return <Dash />;
      return (
        <span className={cn("text-xs tabular-nums", v > 0 ? "text-emerald-600" : v < 0 ? "text-destructive" : "text-muted-foreground")}>
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
    meta: { description: "Passed gene-level permutation threshold (GTEx: Bonferroni-corrected qval<0.05)" } satisfies ColumnMeta,
    cell: ({ getValue }) => (
      <span className={getValue() ? "text-emerald-600 text-xs font-medium" : "text-muted-foreground/40 text-xs"}>
        {getValue() ? "Yes" : "No"}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Filter config (without source — that's now a dimension/tab)
// ---------------------------------------------------------------------------

function buildFilters(genes: string[]): ServerFilterConfig[] {
  return [
    tissueGroupFilter(),
    {
      id: "gene",
      label: "Gene",
      type: "select",
      placeholder: "All genes",
      options: genes.map((g) => ({ value: g, label: g })),
    },
    significantOnlyFilter(),
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

export function QtlsView({ loc, totalCount, genes, initialData }: QtlsViewProps) {
  const searchParams = useClientSearchParams();
  const activeSource = searchParams.get("source") || "all";

  const filters = useMemo(() => buildFilters(genes), [genes]);

  // Show Source column only on "All Sources" tab
  const activeColumns = useMemo(() => {
    if (activeSource === "all") {
      const sourceCol: ColumnDef<QtlRow, unknown> = {
        id: "source",
        accessorKey: "source",
        header: "Source",
        enableSorting: false,
        meta: { description: "QTL study source" } satisfies ColumnMeta,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{sourceLabel(getValue() as string)}</span>
        ),
      };
      // Insert after variant_vcf (index 0)
      return [columns[0], sourceCol, ...columns.slice(1)];
    }
    return columns;
  }, [activeSource]);

  const { data, pageInfo, isLoading, isFetching } = useQtlsQuery({ ref: loc, initialData });

  const handleSourceChange = useCallback((source: string) => {
    const params = new URLSearchParams(window.location.search);
    if (source === "all") {
      params.delete("source");
    } else {
      params.set("source", source);
    }
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, false);
  }, []);

  const sourceDimension: DimensionConfig = useMemo(() => ({
    label: "Source",
    options: QTL_SOURCES.map((s) => ({ value: s.id, label: s.label })),
    value: activeSource,
    onChange: handleSourceChange,
    presentation: "segmented",
  }), [activeSource, handleSourceChange]);

  const hasActiveFilters = Boolean(
    searchParams.get("source") || searchParams.get("gene") ||
    searchParams.get("tissue_group") || searchParams.get("significant_only")
  );
  const liveTotal = pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 25,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({ filters, serverPagination: true, paginationInfo });

  const sourceInfo = QTL_SOURCES.find((s) => s.id === activeSource);
  const subtitle = liveTotal != null
    ? `${liveTotal.toLocaleString()} ${sourceInfo?.label ?? "QTL"} associations`
    : `${sourceInfo?.label ?? "QTL"} associations for variants in this region`;

  return (
    <DataSurface
      data={data}
      columns={activeColumns}
      subtitle={subtitle}
      dimensions={[sourceDimension]}
      searchPlaceholder="Search genes, tissues..."
      searchColumn="gene_symbol"
      exportable
      exportFilename={`qtls-${activeSource}-${loc}`}
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
