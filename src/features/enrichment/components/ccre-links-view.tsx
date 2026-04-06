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
  TissueGroupRow,
} from "@features/enrichment/api/region";
import { useGeneCcreLinksQuery } from "@features/enrichment/hooks/use-gene-ccre-links-query";
import { CcreDetailSheet } from "./ccre-detail-sheet";
import { TissueGroupSummary } from "./tissue-group-summary";
import type { TissueGroupMetricConfig } from "./tissue-group-summary";
import { TissueGroupBackButton } from "./tissue-group-back-button";

// ---------------------------------------------------------------------------
// Source & method config
// ---------------------------------------------------------------------------

const SOURCES = [
  { id: "screen_v4", label: "ENCODE SCREEN" },
  { id: "chiapet", label: "ChIA-PET" },
  { id: "eqtl_ccre", label: "cCRE eQTL" },
  { id: "crispr", label: "CRISPRi" },
] as const;

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

const CCRE_LINKS_GROUP_CONFIG: TissueGroupMetricConfig = {
  metricLabel: "Best Score",
  metricDescription: "Strongest linkage score across all sources (ChIA-PET, SCREEN, eQTL, CRISPRi) in this tissue group",
  countLabel: "Linkages",
  formatMetric: (v) => (v >= 100 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(3)),
  sqrtScale: true,
  showTopItem: true,
  topItemLabel: "Top cCRE",
};

interface CcreLinksViewProps {
  gene: string;
  totalCount: number;
  initialData?: PaginatedResponse<CcreLinkRow>;
  groupedData?: TissueGroupRow[];
}

export function CcreLinksView({
  gene,
  totalCount,
  initialData,
  groupedData,
}: CcreLinksViewProps) {
  const searchParams = useClientSearchParams();
  const activeTissueGroup = searchParams.get("tissue_group");

  if (groupedData?.length && !activeTissueGroup) {
    const total = groupedData.reduce((s, r) => s + r.count, 0);
    return (
      <TissueGroupSummary
        data={groupedData}
        metricConfig={CCRE_LINKS_GROUP_CONFIG}
        subtitle={`${groupedData.length} tissue groups · ${total.toLocaleString()} total linkages`}
      />
    );
  }

  return (
    <CcreLinksDetailView gene={gene} totalCount={totalCount} initialData={initialData} />
  );
}

function CcreLinksDetailView({
  gene,
  totalCount,
  initialData,
}: Omit<CcreLinksViewProps, "groupedData">) {
  const searchParams = useClientSearchParams();
  const activeSource = searchParams.get("source") || "screen_v4";

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
    params.set("source", source);
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
  const activeColumns = useMemo((): ColumnDef<CcreLinkRow, unknown>[] => [
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
  ], [openCcreSheet]);

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

  const hasActiveFilters = Boolean(searchParams.get("method"));
  const liveTotal =
    pageInfo.totalCount
    ?? (!pageInfo.hasMore ? pageInfo.count || undefined : undefined)
    ?? (hasActiveFilters ? undefined : totalCount || undefined);

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
      <TissueGroupBackButton />
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
