"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  EnhancerGeneRow,
  PaginatedResponse,
} from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface EnhancerGeneFilterOptions {
  method: string;
  tissue?: string;
  target_gene?: string;
  min_score?: number;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchEnhancerGenesClient(
  loc: string,
  filters: EnhancerGeneFilterOptions,
): Promise<PaginatedResponse<EnhancerGeneRow>> {
  const params = new URLSearchParams();
  params.set("method", filters.method);
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.target_gene) params.set("target_gene", filters.target_gene);
  if (filters.min_score) params.set("min_score", String(filters.min_score));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/enhancer-genes?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing (always includes method, defaults to abc)
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): EnhancerGeneFilterOptions {
  const f: EnhancerGeneFilterOptions = {
    method: sp.get("method") || "abc",
  };
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const targetGene = sp.get("target_gene");
  if (targetGene) f.target_gene = targetGene;
  const minScore = sp.get("min_score");
  if (minScore) f.min_score = Number(minScore);
  f.sort_by = sp.get("sort_by") || "score";
  f.sort_dir = sp.get("sort_dir") || "desc";
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseEnhancerGenesQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<EnhancerGeneRow>;
}

interface UseEnhancerGenesQueryResult {
  data: EnhancerGeneRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  prefetchNext: () => void;
}

export function useEnhancerGenesQuery({
  loc,
  initialData,
}: UseEnhancerGenesQueryOptions): UseEnhancerGenesQueryResult {
  const searchParams = useClientSearchParams();
  const queryClient = useQueryClient();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const queryKey = useMemo(
    () => ["enhancer-genes", loc, filters] as const,
    [loc, filters],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEnhancerGenesClient(loc, filters),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    ...(isFirstMount.current && initialData ? { initialData } : {}),
  });

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  const prefetchNext = useCallback(() => {
    const nextCursor = query.data?.page_info?.next_cursor;
    if (!nextCursor || !query.data?.page_info?.has_more) return;

    const nextFilters = { ...filters, cursor: nextCursor };
    queryClient.prefetchQuery({
      queryKey: ["enhancer-genes", loc, nextFilters],
      queryFn: () => fetchEnhancerGenesClient(loc, nextFilters),
      staleTime: 5 * 60 * 1000,
    });
  }, [query.data?.page_info, filters, loc, queryClient]);

  return {
    data: query.data?.data ?? [],
    pageInfo: {
      hasMore: query.data?.page_info?.has_more ?? false,
      nextCursor: query.data?.page_info?.next_cursor ?? null,
      totalCount: query.data?.page_info?.total_count ?? null,
      count: query.data?.page_info?.count ?? 0,
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    prefetchNext,
  };
}
