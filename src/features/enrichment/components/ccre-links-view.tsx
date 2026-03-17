"use client";

import { cn } from "@infra/utils";
import { DataSurface } from "@shared/components/ui/data-surface";
import { Dash } from "@shared/components/ui/dash";
import { formatTissueName } from "@shared/utils/tissue-format";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import {
  useServerTable,
  useClientSearchParams,
  updateClientUrl,
} from "@shared/hooks";
import type {
  ColumnMeta,
  DimensionConfig,
} from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import type {
  CcreLinkRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";
import { useGeneCcreLinksQuery } from "@features/enrichment/hooks/use-gene-ccre-links-query";
import { CcreDetailSheet } from "./ccre-detail-sheet";

// ---------------------------------------------------------------------------
// Source & method config
// ---------------------------------------------------------------------------

const SOURCES = [
  { id: "all", label: "All Sources" },
  { id: "chiapet", label: "ChIA-PET" },
  { id: "screen_v4", label: "ENCODE SCREEN" },
  { id: "eqtl_ccre", label: "cCRE eQTL" },
  { id: "crispr", label: "CRISPRi" },
] as const;

function sourceLabel(raw: string): string {
  return SOURCES.find((s) => s.id === raw)?.label ?? raw;
}

const METHOD_LABELS: Record<string, string> = {
  chiapet_link: "ChIA-PET",
  "ABC_(DNase_only)": "ABC (DNase)",
  "ABC_(full)": "ABC (full)",
  EPIraction: "EPIraction",
  GraphRegLR: "GraphRegLR",
  "rE2G_(DNase_only)": "rE2G (DNase)",
  "rE2G_(extended)": "rE2G (extended)",
  eQTL: "eQTL",
  CRISPRi: "CRISPRi",
};

function formatMethod(raw: string): string {
  return METHOD_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// Method filter options (shown when ENCODE SCREEN is active)
// ---------------------------------------------------------------------------

const SCREEN_METHODS = [
  { value: "ABC_(DNase_only)", label: "ABC (DNase)" },
  { value: "ABC_(full)", label: "ABC (full)" },
  { value: "EPIraction", label: "EPIraction" },
  { value: "GraphRegLR", label: "GraphRegLR" },
  { value: "rE2G_(DNase_only)", label: "rE2G (DNase)" },
  { value: "rE2G_(extended)", label: "rE2G (extended)" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CcreLinksViewProps {
  gene: string;
  totalCount: number;
  initialData?: PaginatedResponse<CcreLinkRow>;
}

export function CcreLinksView({
  gene,
  totalCount,
  initialData,
}: CcreLinksViewProps) {
  const searchParams = useClientSearchParams();
  const activeSource = searchParams.get("source") || "all";

  const { data, pageInfo, isLoading, isFetching } = useGeneCcreLinksQuery({
    gene,
    initialData,
  });

  // cCRE detail sheet
  const [selectedCcre, setSelectedCcre] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openCcreSheet = useCallback((ccreId: string) => {
    setSelectedCcre(ccreId);
    setSheetOpen(true);
  }, []);

  // Source dimension (segmented tabs)
  const handleSourceChange = useCallback((source: string) => {
    const params = new URLSearchParams(window.location.search);
    if (source === "all") {
      params.delete("source");
    } else {
      params.set("source", source);
    }
    params.delete("method");
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, false);
  }, []);

  const sourceDimension: DimensionConfig = useMemo(
    () => ({
      label: "Source",
      options: SOURCES.map((s) => ({ value: s.id, label: s.label })),
      value: activeSource,
      onChange: handleSourceChange,
      presentation: "segmented" as const,
    }),
    [activeSource, handleSourceChange],
  );

  // Columns (closure over openCcreSheet)
  const activeColumns = useMemo((): ColumnDef<CcreLinkRow, unknown>[] => {
    const cols: ColumnDef<CcreLinkRow, unknown>[] = [
      {
        id: "ccre_id",
        accessorKey: "ccre_id",
        header: "cCRE",
        enableSorting: false,
        meta: { description: "Candidate cis-regulatory element accession" } satisfies ColumnMeta,
        cell: ({ getValue }) => {
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
      },
    ];

    if (activeSource === "all") {
      cols.push({
        id: "source",
        accessorKey: "source",
        header: "Source",
        enableSorting: false,
        meta: { description: "Data source: ChIA-PET, CRISPRi (experimental), ENCODE SCREEN (computational), or cCRE eQTL" } satisfies ColumnMeta,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {sourceLabel(getValue() as string)}
          </span>
        ),
      });
    }

    cols.push(
      {
        id: "method",
        accessorKey: "method",
        header: "Method",
        enableSorting: false,
        meta: { description: "Prediction or experimental method" } satisfies ColumnMeta,
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatMethod(getValue() as string)}
          </span>
        ),
      },
      {
        id: "tissue_name",
        accessorKey: "tissue_name",
        header: "Tissue",
        enableSorting: false,
        meta: { description: "Tissue or cell type where the linkage was observed" } satisfies ColumnMeta,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {formatTissueName(getValue() as string)}
          </span>
        ),
      },
      {
        id: "score",
        accessorKey: "score",
        header: "Score",
        enableSorting: false,
        meta: { description: "Linkage score (ChIA-PET/SCREEN) or −log₁₀(p) (eQTL)" } satisfies ColumnMeta,
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          if (v == null) return <Dash />;
          return (
            <span className="text-xs tabular-nums text-foreground font-medium">
              {v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(2) : v.toFixed(4)}
            </span>
          );
        },
      },
      {
        id: "effect_size",
        accessorKey: "effect_size",
        header: "Effect (β)",
        enableSorting: false,
        meta: { description: "Effect size (CRISPRi or eQTL). Positive = upregulation." } satisfies ColumnMeta,
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          if (v == null) return <Dash />;
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
    );

    return cols;
  }, [activeSource, openCcreSheet]);

  // Method filter — only when ENCODE SCREEN
  const filters = useMemo((): ServerFilterConfig[] => {
    if (activeSource === "screen_v4") {
      return [
        {
          id: "method",
          label: "Method",
          type: "select",
          placeholder: "All methods",
          options: SCREEN_METHODS,
        },
      ];
    }
    return [];
  }, [activeSource]);

  const hasActiveFilters = Boolean(
    searchParams.get("source") || searchParams.get("method"),
  );
  const liveTotal =
    pageInfo.totalCount ?? (hasActiveFilters ? undefined : totalCount);

  const paginationInfo: ServerPaginationInfo = {
    totalCount: liveTotal,
    pageSize: 50,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters,
    serverPagination: true,
    paginationInfo,
  });

  const sourceInfo = SOURCES.find((s) => s.id === activeSource);
  const subtitle =
    liveTotal != null
      ? `${liveTotal.toLocaleString()} ${sourceInfo?.label ?? ""} cCRE linkages to ${gene}`
      : `cCRE linkages to ${gene}`;

  return (
    <>
      <DataSurface
        data={data}
        columns={activeColumns}
        subtitle={subtitle}
        dimensions={[sourceDimension]}
        searchPlaceholder="Search cCREs, tissues..."
        searchColumn="tissue_name"
        exportable
        exportFilename={`ccre-links-${activeSource}-${gene}`}
        filterable={filters.length > 0}
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
        pageSizeOptions={[50, 100]}
        emptyMessage="No cCRE linkages found for this gene"
      />

      <CcreDetailSheet
        ccreId={selectedCcre}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
