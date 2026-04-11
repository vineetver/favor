"use client";

import type {
  PaginatedResponse,
  SignalRow,
} from "@features/enrichment/api/region";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface SignalFilterOptions {
  tissue?: string;
  tissue_group?: string;
  ccre_class?: string;
  min_signal?: number;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchSignalsClient(
  loc: string,
  filters: SignalFilterOptions,
): Promise<PaginatedResponse<SignalRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.ccre_class) params.set("ccre_class", filters.ccre_class);
  if (filters.min_signal) params.set("min_signal", String(filters.min_signal));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(loc)}/signals?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(searchParams: URLSearchParams): SignalFilterOptions {
  const filters: SignalFilterOptions = {};

  const tissue = searchParams.get("tissue");
  if (tissue) filters.tissue = tissue;

  const tissueGroup = searchParams.get("tissue_group");
  if (tissueGroup) filters.tissue_group = tissueGroup;

  const ccreClass = searchParams.get("ccre_class");
  if (ccreClass) filters.ccre_class = ccreClass;

  const minSignal = searchParams.get("min_signal");
  if (minSignal) filters.min_signal = Number(minSignal);

  filters.sort_by = searchParams.get("sort_by") || "max_signal";
  filters.sort_dir = searchParams.get("sort_dir") || "desc";

  const cursor = searchParams.get("cursor");
  if (cursor) filters.cursor = cursor;

  const pageSize = searchParams.get("page_size");
  filters.limit = pageSize ? Number(pageSize) : 25;

  return filters;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseSignalsQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<SignalRow>;
}

interface UseSignalsQueryResult {
  data: SignalRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  prefetchNext: () => void;
}

export function useSignalsQuery({
  loc,
  initialData,
}: UseSignalsQueryOptions): UseSignalsQueryResult {
  const searchParams = useClientSearchParams();
  const queryClient = useQueryClient();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const queryKey = useMemo(
    () => ["signals", loc, filters] as const,
    [loc, filters],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSignalsClient(loc, filters),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
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
      queryKey: ["signals", loc, nextFilters],
      queryFn: () => fetchSignalsClient(loc, nextFilters),
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
    error: query.error as Error | null,
    prefetchNext,
  };
}
