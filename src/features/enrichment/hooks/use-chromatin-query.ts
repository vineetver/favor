"use client";

import { API_BASE } from "@/config/api";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type {
  ChromatinStateRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface ChromatinFilterOptions {
  tissue?: string;
  tissue_group?: string;
  state_category?: string;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchChromatinClient(
  loc: string,
  filters: ChromatinFilterOptions,
): Promise<PaginatedResponse<ChromatinStateRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.state_category)
    params.set("state_category", filters.state_category);
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): ChromatinFilterOptions {
  const f: ChromatinFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const cat = sp.get("state_category");
  if (cat) f.state_category = cat;
  f.sort_by = sp.get("sort_by") || "position";
  f.sort_dir = sp.get("sort_dir") || "asc";
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseChromatinQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<ChromatinStateRow>;
}

interface UseChromatinQueryResult {
  data: ChromatinStateRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
}

export function useChromatinQuery({
  loc,
  initialData,
}: UseChromatinQueryOptions): UseChromatinQueryResult {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["chromatin-states", loc, filters],
    queryFn: () => fetchChromatinClient(loc, filters),
    placeholderData: (prev) => prev,
    staleTime: 30 * 1000,
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
