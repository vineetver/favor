"use client";

import type { Variant } from "@features/variant/types";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  fetchVariantScan,
  type VariantScanFilterOptions,
} from "../api/variant-scan";

// ============================================================================
// URL -> Filter Parsing
// ============================================================================

function parseFiltersFromUrl(
  searchParams: URLSearchParams,
): VariantScanFilterOptions {
  const filters: VariantScanFilterOptions = {};

  // Page size
  const pageSize = searchParams.get("page_size");
  filters.limit = pageSize ? Number(pageSize) : 20;

  // Cursor
  const cursor = searchParams.get("cursor");
  if (cursor) filters.cursor = cursor;

  // Region type
  const regionType = searchParams.get("region_type");
  if (regionType) filters.gencode_region_type = [regionType];

  // Consequence
  const consequence = searchParams.get("consequence");
  if (consequence) filters.gencode_consequence = [consequence];

  // ClinVar
  const clinvar = searchParams.get("clinvar");
  if (clinvar) filters.clinvar_clnsig = [clinvar];

  // SIFT
  const sift = searchParams.get("sift");
  if (sift) filters.sift_cat = [sift];

  // PolyPhen
  const polyphen = searchParams.get("polyphen");
  if (polyphen) filters.polyphen_cat = [polyphen];

  // AlphaMissense
  const alphamissense = searchParams.get("alphamissense");
  if (alphamissense) filters.alphamissense_class = [alphamissense];

  // gnomAD AF range
  const afMin = searchParams.get("af_min");
  if (afMin) filters.gnomad_genome_af_min = Number(afMin);
  const afMax = searchParams.get("af_max");
  if (afMax) filters.gnomad_genome_af_max = Number(afMax);

  // CADD Phred min
  const caddMin = searchParams.get("cadd_min");
  if (caddMin) filters.cadd_phred_min = Number(caddMin);

  return filters;
}

// ============================================================================
// Query Key
// ============================================================================

function getQueryKey(gene: string, filters: VariantScanFilterOptions) {
  return ["variant-scan", gene, filters] as const;
}

// ============================================================================
// Hook
// ============================================================================

interface UseVariantScanQueryOptions {
  gene: string;
  initialData?: {
    data: Variant[];
    hasMore: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
}

interface UseVariantScanQueryResult {
  data: Variant[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  prefetchNext: () => void;
}

/**
 * TanStack Query hook for variant scan data.
 * Reads filters from URL params and fetches data client-side.
 */
export function useVariantScanQuery({
  gene,
  initialData,
}: UseVariantScanQueryOptions): UseVariantScanQueryResult {
  const searchParams = useClientSearchParams();
  const queryClient = useQueryClient();
  const isFirstMount = useRef(true);

  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams),
    [searchParams],
  );

  const queryKey = useMemo(
    () => getQueryKey(gene, filters),
    [gene, filters],
  );

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const result = await fetchVariantScan(gene, filters);
      if (signal?.aborted) throw new Error("Aborted");
      return result;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    ...(isFirstMount.current && initialData
      ? {
          initialData: {
            data: initialData.data,
            pageInfo: {
              next_cursor: initialData.nextCursor,
              count: initialData.data.length,
              has_more: initialData.hasMore,
              total_count: initialData.totalCount,
            },
          },
        }
      : {}),
  });

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  const prefetchNext = () => {
    const nextCursor = query.data?.pageInfo?.next_cursor;
    if (!nextCursor || !query.data?.pageInfo?.has_more) return;

    const nextFilters: VariantScanFilterOptions = {
      ...filters,
      cursor: nextCursor,
    };

    const nextQueryKey = getQueryKey(gene, nextFilters);
    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => fetchVariantScan(gene, nextFilters),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    data: query.data?.data ?? [],
    pageInfo: {
      hasMore: query.data?.pageInfo?.has_more ?? false,
      nextCursor: query.data?.pageInfo?.next_cursor ?? null,
      totalCount: query.data?.pageInfo?.total_count,
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    prefetchNext,
  };
}
