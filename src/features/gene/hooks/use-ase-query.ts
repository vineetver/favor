"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type {
  AseRow,
  PaginatedResponse,
} from "@features/gene/api/region";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface AseFilterOptions {
  tissue?: string;
  tissue_group?: string;
  assay?: string;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchAseClient(
  loc: string,
  filters: AseFilterOptions,
): Promise<PaginatedResponse<AseRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.assay) params.set("assay", filters.assay);
  if (filters.significant_only) params.set("significant_only", "true");
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `/api/v1/regions/${encodeURIComponent(loc)}/ase?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): AseFilterOptions {
  const f: AseFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const assay = sp.get("assay");
  if (assay) f.assay = assay;
  if (sp.get("significant_only") === "true") f.significant_only = true;
  f.sort_by = sp.get("sort_by") || "neglog_pvalue";
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

interface UseAseQueryOptions {
  loc: string;
  initialData?: PaginatedResponse<AseRow>;
}

interface UseAseQueryResult {
  data: AseRow[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number | null;
    count: number;
  };
  isLoading: boolean;
  isFetching: boolean;
}

export function useAseQuery({
  loc,
  initialData,
}: UseAseQueryOptions): UseAseQueryResult {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["ase", loc, filters],
    queryFn: () => fetchAseClient(loc, filters),
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
