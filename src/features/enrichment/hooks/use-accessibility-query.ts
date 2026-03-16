"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type {
  AccessibilityRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface AccessibilityFilterOptions {
  tissue?: string;
  tissue_group?: string;
  min_signal?: number;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchAccessibilityClient(
  loc: string,
  filters: AccessibilityFilterOptions,
): Promise<PaginatedResponse<AccessibilityRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.min_signal != null)
    params.set("min_signal", String(filters.min_signal));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/accessibility?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): AccessibilityFilterOptions {
  const f: AccessibilityFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const minSig = sp.get("min_signal");
  if (minSig) f.min_signal = Number(minSig);
  f.sort_by = sp.get("sort_by") || "max_signal";
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

interface UseAccessibilityQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<AccessibilityRow>;
}

interface UseAccessibilityQueryResult {
  data: AccessibilityRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
}

export function useAccessibilityQuery({
  loc,
  initialData,
}: UseAccessibilityQueryOptions): UseAccessibilityQueryResult {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["accessibility", loc, filters],
    queryFn: () => fetchAccessibilityClient(loc, filters),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    ...(isFirstMount.current && initialData ? { initialData } : {}),
  });

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

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
  };
}
