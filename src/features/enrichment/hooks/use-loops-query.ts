"use client";

import { API_BASE } from "@/config/api";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type {
  LoopRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface LoopsFilterOptions {
  tissue?: string;
  tissue_group?: string;
  assay?: string;
  cursor?: string;
  limit?: number;
}

async function fetchLoopsClient(
  loc: string,
  filters: LoopsFilterOptions,
): Promise<PaginatedResponse<LoopRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.assay) params.set("assay", filters.assay);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `${API_BASE}/regions/${encodeURIComponent(loc)}/loops?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): LoopsFilterOptions {
  const f: LoopsFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const assay = sp.get("assay");
  if (assay) f.assay = assay;
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseLoopsQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<LoopRow>;
}

interface UseLoopsQueryResult {
  data: LoopRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
}

export function useLoopsQuery({
  loc,
  initialData,
}: UseLoopsQueryOptions): UseLoopsQueryResult {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["loops", loc, filters],
    queryFn: () => fetchLoopsClient(loc, filters),
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
