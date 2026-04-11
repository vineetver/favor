"use client";

import type {
  PaginatedResponse,
  VariantAllelicImbalanceRow,
} from "@features/enrichment/api/region";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface AllelicImbalanceFilterOptions {
  tissue?: string;
  tissue_group?: string;
  mark?: string;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchAllelicImbalanceClient(
  ref: string,
  filters: AllelicImbalanceFilterOptions,
): Promise<PaginatedResponse<VariantAllelicImbalanceRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.mark) params.set("mark", filters.mark);
  if (filters.significant_only) params.set("significant_only", "true");
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `${API_BASE}/variants/${encodeURIComponent(ref)}/allelic-imbalance?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): AllelicImbalanceFilterOptions {
  const f: AllelicImbalanceFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const mark = sp.get("mark");
  if (mark) f.mark = mark;
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

interface UseAllelicImbalanceQueryOptions {
  ref: string;
  initialData?: PaginatedResponse<VariantAllelicImbalanceRow>;
}

export function useAllelicImbalanceQuery({
  ref,
  initialData,
}: UseAllelicImbalanceQueryOptions) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["allelic-imbalance", ref, filters],
    queryFn: () => fetchAllelicImbalanceClient(ref, filters),
    placeholderData: (
      prev: PaginatedResponse<VariantAllelicImbalanceRow> | undefined,
    ) => prev,
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
