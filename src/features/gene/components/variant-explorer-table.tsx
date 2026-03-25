"use client";

import type { Variant } from "@features/variant/types";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { ServerFilterConfig, ServerPaginationInfo } from "@shared/hooks";
import { useServerTable } from "@shared/hooks";
import { Table2 } from "lucide-react";
import { useEffect } from "react";
import { variantExplorerColumns } from "../config/hg38/columns/variant-explorer";
import { useVariantScanQuery } from "../hooks/use-variant-scan-query";

// ============================================================================
// Filter Configuration
// ============================================================================

const VARIANT_FILTERS: ServerFilterConfig[] = [
  {
    id: "region_type",
    label: "Region Type",
    type: "select",
    placeholder: "All regions",
    options: [
      { value: "exonic", label: "Exonic" },
      { value: "intronic", label: "Intronic" },
      { value: "splicing", label: "Splicing" },
      { value: "UTR3", label: "3' UTR" },
      { value: "UTR5", label: "5' UTR" },
      { value: "upstream", label: "Upstream" },
      { value: "downstream", label: "Downstream" },
      { value: "intergenic", label: "Intergenic" },
      { value: "ncRNA_exonic", label: "ncRNA Exonic" },
      { value: "ncRNA_intronic", label: "ncRNA Intronic" },
      { value: "exonic;splicing", label: "Exonic/Splicing" },
    ],
  },
  {
    id: "consequence",
    label: "Consequence",
    type: "select",
    placeholder: "All consequences",
    options: [
      { value: "nonsynonymous SNV", label: "Missense" },
      { value: "synonymous SNV", label: "Synonymous" },
      { value: "stopgain", label: "Stopgain" },
      { value: "stoploss", label: "Stoploss" },
      { value: "frameshift deletion", label: "Frameshift Deletion" },
      { value: "frameshift insertion", label: "Frameshift Insertion" },
      { value: "frameshift substitution", label: "Frameshift Substitution" },
      { value: "nonframeshift deletion", label: "Inframe Deletion" },
      { value: "nonframeshift insertion", label: "Inframe Insertion" },
      { value: "nonframeshift substitution", label: "Inframe Substitution" },
    ],
  },
  {
    id: "clinvar",
    label: "ClinVar Significance",
    type: "select",
    placeholder: "All significances",
    options: [
      { value: "Pathogenic", label: "Pathogenic" },
      { value: "Likely_pathogenic", label: "Likely Pathogenic" },
      { value: "Uncertain_significance", label: "Uncertain" },
      { value: "Likely_benign", label: "Likely Benign" },
      { value: "Benign", label: "Benign" },
      { value: "Conflicting_classifications_of_pathogenicity", label: "Conflicting" },
      { value: "drug_response", label: "Drug Response" },
      { value: "risk_factor", label: "Risk Factor" },
    ],
  },
  {
    id: "sift",
    label: "SIFT",
    type: "select",
    placeholder: "All predictions",
    options: [
      { value: "deleterious", label: "Deleterious" },
      { value: "tolerated", label: "Tolerated" },
    ],
  },
  {
    id: "polyphen",
    label: "PolyPhen",
    type: "select",
    placeholder: "All predictions",
    options: [
      { value: "probably_damaging", label: "Probably Damaging" },
      { value: "possibly_damaging", label: "Possibly Damaging" },
      { value: "benign", label: "Benign" },
    ],
  },
  {
    id: "alphamissense",
    label: "AlphaMissense",
    type: "select",
    placeholder: "All classes",
    options: [
      { value: "likely_pathogenic", label: "Likely Pathogenic" },
      { value: "ambiguous", label: "Ambiguous" },
      { value: "likely_benign", label: "Likely Benign" },
    ],
  },
  {
    id: "af_min",
    label: "gnomAD AF Min",
    type: "text",
    placeholder: "e.g., 0.001",
  },
  {
    id: "af_max",
    label: "gnomAD AF Max",
    type: "text",
    placeholder: "e.g., 0.05",
  },
  {
    id: "cadd_min",
    label: "CADD Phred Min",
    type: "text",
    placeholder: "e.g., 20",
  },
];

// ============================================================================
// Component
// ============================================================================

interface VariantExplorerTableProps {
  gene: string;
  /** When set, uses ?region= instead of ?gene= for the variant scan API */
  region?: string;
  initialData?: Variant[];
  initialPaginationInfo?: ServerPaginationInfo;
}

export function VariantExplorerTable({
  gene,
  region,
  initialData = [],
  initialPaginationInfo,
}: VariantExplorerTableProps) {
  const {
    data: queryData,
    pageInfo,
    isFetching,
    prefetchNext,
  } = useVariantScanQuery({
    gene,
    region,
    initialData: initialData.length > 0
      ? {
          data: initialData,
          hasMore: initialPaginationInfo?.hasMore ?? false,
          nextCursor: initialPaginationInfo?.currentCursor ?? null,
          totalCount: initialPaginationInfo?.totalCount,
        }
      : undefined,
  });

  const data = queryData.length > 0 ? queryData : initialData;

  const paginationInfo: ServerPaginationInfo = {
    totalCount: pageInfo.totalCount,
    pageSize: initialPaginationInfo?.pageSize ?? 20,
    hasMore: pageInfo.hasMore,
    currentCursor: pageInfo.nextCursor,
  };

  const tableState = useServerTable({
    filters: VARIANT_FILTERS,
    debounceDelay: 400,
    serverPagination: true,
    paginationInfo,
  });

  // Prefetch next page
  useEffect(() => {
    if (pageInfo.hasMore && !isFetching) {
      prefetchNext();
    }
  }, [pageInfo.hasMore, isFetching, prefetchNext]);

  return (
    <DataSurface
      data={data}
      columns={variantExplorerColumns}
      icon={Table2}
      title="Variant Explorer"
      subtitle={
        pageInfo.totalCount
          ? `${pageInfo.totalCount.toLocaleString()} variants in ${gene}`
          : `Variants in ${gene}`
      }
      searchPlaceholder="Search variants..."
      searchColumn="variant_vcf"
      exportable
      exportFilename={`variants-${gene}`}
      filterable
      filters={VARIANT_FILTERS}
      filterValues={tableState.filterValues}
      onFilterChange={tableState.onFilterChange}
      filterChips={tableState.filterChips}
      onRemoveFilterChip={tableState.onRemoveFilterChip}
      onClearFilters={tableState.onClearFilters}
      loading={isFetching}
      serverPagination={tableState.pagination}
      emptyMessage="No variants found matching the current filters"
    />
  );
}
