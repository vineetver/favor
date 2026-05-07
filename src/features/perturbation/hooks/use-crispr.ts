"use client";

import type { PaginatedResponse } from "@features/enrichment/api/region";
import { useQuery } from "@tanstack/react-query";
import { fetchCrispr } from "../api";
import { CRISPR_PAGE_LIMIT } from "../constants";
import type { CrisprRow, FetchCrisprParams } from "../types";

interface UseCrisprOptions {
  loc: string;
  filters?: FetchCrisprParams;
  initialData?: PaginatedResponse<CrisprRow>;
  enabled?: boolean;
}

export function useCrispr({
  loc,
  filters,
  initialData,
  enabled = true,
}: UseCrisprOptions) {
  const query = useQuery({
    queryKey: [
      "crispr",
      loc,
      filters?.perturbation_type ?? null,
      filters?.tissue ?? null,
      filters?.significant_only ?? false,
      filters?.limit ?? CRISPR_PAGE_LIMIT,
    ],
    queryFn: () => fetchCrispr(loc, { limit: CRISPR_PAGE_LIMIT, ...filters }),
    enabled,
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const pageInfo = query.data?.page_info;
  return {
    rows: query.data?.data ?? [],
    /** Server-reported total when available; null when the endpoint doesn't expose it. */
    totalCount: pageInfo?.total_count ?? null,
    /** Whether the API has more rows beyond what was returned. */
    hasMore: pageInfo?.has_more ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
