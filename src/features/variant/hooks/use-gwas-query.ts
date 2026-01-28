"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { fetchGwasAssociations, type GwasFilterOptions } from "../api/gwas";
import type { GwasAssociationRow, GwasMeta } from "../types/gwas";

/**
 * Parse URL searchParams into GwasFilterOptions
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): GwasFilterOptions {
  const filters: GwasFilterOptions = {};

  // Page size
  const pageSize = searchParams.get("page_size");
  if (pageSize) {
    filters.limit = Number(pageSize);
  } else {
    filters.limit = 20; // default
  }

  // Cursor
  const cursor = searchParams.get("cursor");
  if (cursor) {
    filters.cursor = cursor;
  }

  // Significance level → pvalue_mlog_min
  const significance = searchParams.get("significance");
  if (significance === "genome-wide") {
    filters.pvalueMlogMin = 7.3;
  } else if (significance === "suggestive") {
    filters.pvalueMlogMin = 5;
  } else if (significance === "nominal") {
    filters.pvalueMlogMin = 1.3;
  }

  // Direct mappings
  const trait = searchParams.get("trait");
  if (trait) {
    filters.traitContains = trait;
  }

  const study = searchParams.get("study");
  if (study) {
    filters.studyAccession = study;
  }

  const pubmed = searchParams.get("pubmed");
  if (pubmed) {
    filters.pubmedId = pubmed;
  }

  return filters;
}

/**
 * Generate a stable query key from variant and filters
 */
function getQueryKey(variantVcf: string, filters: GwasFilterOptions) {
  return ["gwas", variantVcf, filters] as const;
}

interface UseGwasQueryOptions {
  variantVcf: string;
  /** Initial data from SSR (used on first load only) */
  initialData?: {
    data: GwasAssociationRow[];
    meta: GwasMeta | null;
    hasMore: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
}

interface UseGwasQueryResult {
  data: GwasAssociationRow[];
  meta: GwasMeta | null;
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount?: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  /** Prefetch next page */
  prefetchNext: () => void;
}

/**
 * TanStack Query hook for GWAS associations.
 * Reads filters from URL params and fetches data client-side.
 * Uses placeholderData to avoid flickering during navigation.
 */
export function useGwasQuery({
  variantVcf,
  initialData,
}: UseGwasQueryOptions): UseGwasQueryResult {
  const searchParams = useClientSearchParams();
  const queryClient = useQueryClient();

  // Track if this is the first mount (to use initialData)
  const isFirstMount = useRef(true);

  // Parse current filters from URL
  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams),
    [searchParams],
  );

  // Generate query key
  const queryKey = useMemo(
    () => getQueryKey(variantVcf, filters),
    [variantVcf, filters],
  );

  // Use TanStack Query with placeholderData to keep previous data while fetching
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const result = await fetchGwasAssociations(variantVcf, filters);
      // Simulate AbortController support (if your fetch supports it)
      if (signal?.aborted) {
        throw new Error("Aborted");
      }
      return result;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Use initialData only on first mount
    ...(isFirstMount.current && initialData
      ? {
          initialData: {
            data: initialData.data,
            meta: initialData.meta,
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

  // After first render, disable initialData usage
  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  // Prefetch next page function
  const prefetchNext = () => {
    const nextCursor = query.data?.pageInfo?.next_cursor;
    if (!nextCursor || !query.data?.pageInfo?.has_more) return;

    const nextFilters: GwasFilterOptions = {
      ...filters,
      cursor: nextCursor,
    };

    const nextQueryKey = getQueryKey(variantVcf, nextFilters);
    queryClient.prefetchQuery({
      queryKey: nextQueryKey,
      queryFn: () => fetchGwasAssociations(variantVcf, nextFilters),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    data: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
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
