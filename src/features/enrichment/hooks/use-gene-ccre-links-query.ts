"use client";

import type {
  CcreLinkRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface GeneCcreLinksFilterOptions {
  source?: string;
  method?: string;
  tissue?: string;
  tissue_group?: string;
  cursor?: string;
  limit?: number;
}

async function fetchGeneCcreLinksClient(
  gene: string,
  filters: GeneCcreLinksFilterOptions,
): Promise<PaginatedResponse<CcreLinkRow>> {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.method) params.set("method", filters.method);
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 50));

  const res = await fetch(
    `${API_BASE}/genes/${encodeURIComponent(gene)}/ccre-links?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): GeneCcreLinksFilterOptions {
  const f: GeneCcreLinksFilterOptions = {};
  f.source = sp.get("source") || "screen_v4";
  const method = sp.get("method");
  if (method) f.method = method;
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 50;
  return f;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseGeneCcreLinksQueryOptions {
  gene: string;
  initialData?: PaginatedResponse<CcreLinkRow>;
}

export function useGeneCcreLinksQuery({
  gene,
  initialData,
}: UseGeneCcreLinksQueryOptions) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["gene-ccre-links", gene, filters],
    queryFn: () => fetchGeneCcreLinksClient(gene, filters),
    placeholderData: (prev: PaginatedResponse<CcreLinkRow> | undefined) => prev,
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
