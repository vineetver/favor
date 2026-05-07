"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { fetchScoresetVariants } from "../api";
import type { FetchVariantsParams, MavedbVariant, Page } from "../types";

interface Options {
  urn: string;
  filters?: Omit<FetchVariantsParams, "cursor" | "limit">;
  pageSize: number;
  initialData?: Page<MavedbVariant>;
}

/**
 * Server-side cursor pagination for `/scoresets/{urn}/variants`. Holds a
 * stack of cursors — the entry at index `i` is the cursor used to fetch
 * page `i` (with `undefined` for page 0). `next` pushes the current page's
 * `next_cursor`; `prev` pops.
 */
export function useScoresetVariants({
  urn,
  filters,
  pageSize,
  initialData,
}: Options) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[cursors.length - 1];
  const pageIndex = cursors.length - 1;

  // Reset to page 1 whenever filters or page size change.
  const filterKey = JSON.stringify({
    q: filters?.q ?? null,
    smin: filters?.score_min ?? null,
    smax: filters?.score_max ?? null,
    pageSize,
  });
  useEffect(() => {
    setCursors([undefined]);
  }, [filterKey]);

  // Only seed SSR data on the unfiltered first page. Reusing `initialData` for
  // filtered queries would have React Query treat the unfiltered rows as the
  // fresh result for the filtered key (staleTime 5 min) and skip the refetch.
  const filtersEmpty =
    !filters?.q && filters?.score_min == null && filters?.score_max == null;
  const seedable =
    pageIndex === 0 &&
    filtersEmpty &&
    initialData &&
    initialData.data.length > 0
      ? initialData
      : undefined;

  const query = useQuery({
    queryKey: [
      "mave",
      "variants",
      urn,
      filters?.q ?? null,
      filters?.score_min ?? null,
      filters?.score_max ?? null,
      pageSize,
      cursor ?? null,
    ],
    queryFn: () =>
      fetchScoresetVariants(urn, {
        limit: pageSize,
        cursor,
        ...filters,
      }),
    initialData: seedable,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const nextCursor = query.data?.page_info.next_cursor ?? null;

  const next = useCallback(() => {
    if (!nextCursor) return;
    setCursors((prev) => [...prev, nextCursor]);
  }, [nextCursor]);

  const prev = useCallback(() => {
    setCursors((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  return {
    rows: query.data?.data ?? [],
    pageIndex,
    hasNext: !!nextCursor,
    hasPrev: pageIndex > 0,
    next,
    prev,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
