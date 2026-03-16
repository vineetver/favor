"use client";

import { useClientSearchParams } from "@shared/hooks";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { QtlRow, PaginatedResponse } from "@features/gene/api/region";

interface QtlFilterOptions {
  tissue?: string;
  tissue_group?: string;
  source?: string;
  gene?: string;
  significant_only?: boolean;
  sort_by?: string;
  sort_dir?: string;
  cursor?: string;
  limit?: number;
}

async function fetchQtlsClient(
  ref: string,
  filters: QtlFilterOptions,
): Promise<PaginatedResponse<QtlRow>> {
  const params = new URLSearchParams();
  if (filters.tissue) params.set("tissue", filters.tissue);
  if (filters.tissue_group) params.set("tissue_group", filters.tissue_group);
  if (filters.source) params.set("source", filters.source);
  if (filters.gene) params.set("gene", filters.gene);
  if (filters.significant_only) params.set("significant_only", "true");
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
  if (filters.cursor) params.set("cursor", filters.cursor);
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(
    `/api/v1/variants/${encodeURIComponent(ref)}/qtls?${params}`,
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function parseFilters(sp: URLSearchParams): QtlFilterOptions {
  const f: QtlFilterOptions = {};
  const tissue = sp.get("tissue");
  if (tissue) f.tissue = tissue;
  const tissueGroup = sp.get("tissue_group");
  if (tissueGroup) f.tissue_group = tissueGroup;
  const source = sp.get("source");
  if (source) f.source = source;
  const gene = sp.get("gene");
  if (gene) f.gene = gene;
  if (sp.get("significant_only") === "true") f.significant_only = true;
  f.sort_by = sp.get("sort_by") || "neglog_pvalue";
  f.sort_dir = sp.get("sort_dir") || "desc";
  const cursor = sp.get("cursor");
  if (cursor) f.cursor = cursor;
  const pageSize = sp.get("page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

interface UseQtlsQueryOptions {
  ref: string;
  initialData?: PaginatedResponse<QtlRow>;
}

export function useQtlsQuery({ ref, initialData }: UseQtlsQueryOptions) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["qtls", ref, filters],
    queryFn: () => fetchQtlsClient(ref, filters),
    placeholderData: (prev: PaginatedResponse<QtlRow> | undefined) => prev,
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
