"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable } from "@shared/hooks";
import { BarChart3, BookOpen } from "lucide-react";
import { useEffect, useMemo } from "react";
import { gwasCatalogColumns } from "../config/hg38/columns/gwas-catalog";
import { useGwasQuery } from "../hooks/use-gwas-query";
import type { GwasAssociationRow, GwasMeta } from "../types/gwas";

// ============================================================================
// Types
// ============================================================================

interface ServerFilters {
  significance?: string;
  trait?: string;
  study?: string;
  pubmed?: string;
}

interface GwasCatalogTableProps {
  data: GwasAssociationRow[];
  /** Metadata from API (total counts, unique traits/studies) */
  meta?: GwasMeta | null;
  variantVcf?: string;
  /** Server-side filter values from URL */
  serverFilters?: ServerFilters;
  /** Server pagination info */
  paginationInfo?: ServerPaginationInfo;
}

// ============================================================================
// Filter Configuration
// ============================================================================

const GWAS_FILTERS: ServerFilterConfig[] = [
  {
    id: "significance",
    label: "Significance Level",
    type: "select",
    placeholder: "All significance levels",
    options: [
      { value: "genome-wide", label: "Genome-wide (p < 5×10⁻⁸)" },
      { value: "suggestive", label: "Suggestive (p < 10⁻⁵)" },
      { value: "nominal", label: "Nominal (p < 0.05)" },
    ],
    chipLabel: (value) => {
      const labels: Record<string, string> = {
        "genome-wide": "Genome-wide significant",
        suggestive: "Suggestive",
        nominal: "Nominal",
      };
      return labels[value] || value;
    },
  },
  {
    id: "trait",
    label: "Trait Contains",
    type: "text",
    placeholder: "e.g., cholesterol, diabetes...",
  },
  {
    id: "study",
    label: "Study Accession",
    type: "text",
    placeholder: "e.g., GCST90565128",
  },
  {
    id: "pubmed",
    label: "PubMed ID",
    type: "text",
    placeholder: "e.g., 39909172",
  },
];

// ============================================================================
// Stub Visualization Component
// ============================================================================

function GwasVisualizationStub({ data }: { data: GwasAssociationRow[] }) {
  const stats = useMemo(() => {
    const genomeWide = data.filter((r) => (r.pvalueMlog ?? 0) >= 7.3).length;
    const suggestive = data.filter(
      (r) => (r.pvalueMlog ?? 0) >= 5 && (r.pvalueMlog ?? 0) < 7.3,
    ).length;
    const uniqueTraits = new Set(
      data.map((r) => r.diseaseTrait || r.trait).filter(Boolean),
    ).size;
    const topTrait = [...data].sort(
      (a, b) => (b.pvalueMlog ?? 0) - (a.pvalueMlog ?? 0),
    )[0];

    return {
      total: data.length,
      genomeWide,
      suggestive,
      uniqueTraits,
      topTrait,
    };
  }, [data]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <BarChart3 className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        GWAS Visualization Coming Soon
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Interactive Manhattan plot and trait significance charts will be
        available here.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-muted-foreground">
            Total Associations
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">
            {stats.genomeWide}
          </div>
          <div className="text-xs text-muted-foreground">Genome-wide Sig.</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">
            {stats.suggestive}
          </div>
          <div className="text-xs text-muted-foreground">Suggestive</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {stats.uniqueTraits}
          </div>
          <div className="text-xs text-muted-foreground">Unique Traits</div>
        </div>
      </div>

      {stats.topTrait && (
        <div className="mt-6 text-center">
          <div className="text-xs text-muted-foreground mb-1">
            Most Significant Association
          </div>
          <div className="text-sm font-medium">
            {stats.topTrait.diseaseTrait || stats.topTrait.trait}
          </div>
          <div className="text-xs text-muted-foreground">
            −log₁₀(p) = {stats.topTrait.pvalueMlog?.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GwasCatalogTable({
  data: initialData,
  meta: initialMeta,
  variantVcf = "",
  serverFilters = {},
  paginationInfo: initialPaginationInfo,
}: GwasCatalogTableProps) {
  // Use TanStack Query to fetch data client-side based on URL params
  const {
    data: queryData,
    meta: queryMeta,
    pageInfo,
    isLoading,
    isFetching,
    prefetchNext,
  } = useGwasQuery({
    variantVcf,
    initialData: initialData.length > 0 ? {
      data: initialData,
      meta: initialMeta ?? null,
      hasMore: initialPaginationInfo?.hasMore ?? false,
      nextCursor: initialPaginationInfo?.currentCursor ?? null,
      totalCount: initialPaginationInfo?.totalCount,
    } : undefined,
  });

  // Use query data (falls back to initial data on first render)
  const data = queryData.length > 0 ? queryData : initialData;
  const meta = queryMeta ?? initialMeta;

  // Pagination info from query
  const paginationInfo: ServerPaginationInfo = {
    totalCount: pageInfo.totalCount,
    pageSize: initialPaginationInfo?.pageSize ?? 20,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  // Use the server table hook to manage all filter and pagination state
  const tableState = useServerTable({
    filters: GWAS_FILTERS,
    serverFilters: {
      significance: serverFilters.significance ?? "",
      trait: serverFilters.trait ?? "",
      study: serverFilters.study ?? "",
      pubmed: serverFilters.pubmed ?? "",
    },
    debounceDelay: 400,
    serverPagination: true,
    paginationInfo,
  });

  // Prefetch next page when data arrives (optional optimization)
  useEffect(() => {
    if (pageInfo.hasMore && !isFetching) {
      prefetchNext();
    }
  }, [pageInfo.hasMore, isFetching, prefetchNext]);

  // Use server meta when available, fallback to computed stats
  const subtitle = useMemo(() => {
    if (meta) {
      return `${meta.totalCount.toLocaleString()} associations across ${meta.uniqueTraits.toLocaleString()} traits from ${meta.uniqueStudies.toLocaleString()} studies`;
    }
    // Fallback: compute from current page data
    const uniqueTraits = new Set(
      data.map((r) => r.diseaseTrait || r.trait).filter(Boolean),
    ).size;
    return `${data.length} associations across ${uniqueTraits} traits`;
  }, [meta, data]);

  return (
    <DataSurface
      data={data}
      columns={gwasCatalogColumns}
      icon={BookOpen}
      title="GWAS Catalog Associations"
      subtitle={subtitle}
      searchPlaceholder="Search traits, genes, authors..."
      searchColumn="diseaseTrait"
      exportable
      exportFilename={`gwas-catalog-${variantVcf || "variant"}`}
      filterable
      filters={GWAS_FILTERS}
      filterValues={tableState.filterValues}
      onFilterChange={tableState.onFilterChange}
      filterChips={tableState.filterChips}
      onRemoveFilterChip={tableState.onRemoveFilterChip}
      onClearFilters={tableState.onClearFilters}
      loading={isFetching}
      showViewSwitch
      visualization={GwasVisualizationStub}
      serverPagination={tableState.pagination}
      emptyMessage="No GWAS associations found for this variant"
    />
  );
}
