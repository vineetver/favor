"use client";

import type { Variant } from "@features/variant/types";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  ARRAY_FIELDS,
  NUMERIC_FIELDS,
  SORTABLE_COLUMNS,
  fetchVariantScan,
  nextSearchParamsToUrlSearchParams,
  parseVariantScanFiltersFromUrl,
  type VariantScanFilterOptions,
} from "../api/variant-scan";

// Re-export URL helpers (defined in the server-safe API client) so existing
// callers can keep importing them from this module.
export {
  ARRAY_FIELDS,
  NUMERIC_FIELDS,
  SORTABLE_COLUMNS,
  nextSearchParamsToUrlSearchParams,
  parseVariantScanFiltersFromUrl,
};

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
  /** When set, uses ?region= instead of ?gene= */
  region?: string;
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
  region,
  initialData,
}: UseVariantScanQueryOptions): UseVariantScanQueryResult {
  const searchParams = useClientSearchParams();
  const queryClient = useQueryClient();
  const isFirstMount = useRef(true);

  const scope = region ? "region" : "gene";
  const target = region ?? gene;

  const filters = useMemo(
    () => ({
      ...parseVariantScanFiltersFromUrl(searchParams),
      scope: scope as "gene" | "region",
    }),
    [searchParams, scope],
  );

  const queryKey = useMemo(
    () => getQueryKey(target, filters),
    [target, filters],
  );

  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const result = await fetchVariantScan(target, filters);
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

    const nextQueryKey = getQueryKey(target, nextFilters);
    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => fetchVariantScan(target, nextFilters),
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
