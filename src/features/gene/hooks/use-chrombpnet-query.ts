"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { ChromBpnetRow, PaginatedResponse } from "@features/gene/api/region";

interface ChromBpnetFilterOptions {
  tissue?: string;
  tissue_group?: string;
  min_score?: number;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchChromBpnetClient(
  ref: string,
  filters: ChromBpnetFilterOptions,
): Promise<PaginatedResponse<ChromBpnetRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.min_score != null) params.set("min_score", String(filters.min_score));
  if (filters.significant_only) params.set("significant_only", "true");
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `/api/v1/variants/${encodeURIComponent(ref)}/chrombpnet?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function parseFilters(sp: URLSearchParams): ChromBpnetFilterOptions {
  const f: ChromBpnetFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  f.sort_by = sp.get("sort_by") || "combined_score";
  f.sort_dir = sp.get("sort_dir") || "desc";
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

interface UseChromBpnetQueryOptions {
  ref: string;
  initialData?: PaginatedResponse<ChromBpnetRow>;
}

export function useChromBpnetQuery({ ref, initialData }: UseChromBpnetQueryOptions) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["chrombpnet", ref, filters],
    queryFn: () => fetchChromBpnetClient(ref, filters),
    placeholderData: (prev: PaginatedResponse<ChromBpnetRow> | undefined) => prev,
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
