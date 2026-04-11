"use client";

import type {
  CcreGeneLinkRow,
  PaginatedResponse,
} from "@features/enrichment/api/region";
import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

interface CcreGeneLinksFilterOptions {
  source?: string;
  method?: string;
  tissue?: string;
  tissue_group?: string;
  gene?: string;
  cursor?: string;
  limit?: number;
}

async function fetchCcreGeneLinksClient(
  ccreId: string,
  filters: CcreGeneLinksFilterOptions,
): Promise<PaginatedResponse<CcreGeneLinkRow>> {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.method) params.set("method", filters.method);
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.gene) params.set("gene", filters.gene);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 50));

  const res = await fetch(
    `${API_BASE}/ccres/${encodeURIComponent(ccreId)}/gene-links?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// URL → filter parsing
// ---------------------------------------------------------------------------

function parseFilters(sp: URLSearchParams): CcreGeneLinksFilterOptions {
  const f: CcreGeneLinksFilterOptions = {};
  f.source = sp.get("source") || "screen_v4";
  const method = sp.get("method");
  if (method) f.method = method;
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const gene = sp.get("gene");
  if (gene) f.gene = gene;
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 50;
  return f;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseCcreGeneLinksQueryOptions {
  ccreId: string;
  initialData?: PaginatedResponse<CcreGeneLinkRow>;
}

export function useCcreGeneLinksQuery({
  ccreId,
  initialData,
}: UseCcreGeneLinksQueryOptions) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["ccre-gene-links", ccreId, filters],
    queryFn: () => fetchCcreGeneLinksClient(ccreId, filters),
    placeholderData: (prev: PaginatedResponse<CcreGeneLinkRow> | undefined) =>
      prev,
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
