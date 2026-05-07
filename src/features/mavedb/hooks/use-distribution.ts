"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchDistribution } from "../api";
import type { DistributionView } from "../types";

interface Options {
  urn: string;
  calibrationTitle: string | null;
  view: DistributionView;
  bins?: number;
  enabled?: boolean;
}

export function useDistribution({
  urn,
  calibrationTitle,
  view,
  bins,
  enabled = true,
}: Options) {
  const query = useQuery({
    queryKey: ["mave", "dist", urn, calibrationTitle, view, bins ?? null],
    queryFn: () =>
      fetchDistribution(urn, {
        calibration_title: calibrationTitle ?? undefined,
        view,
        bins,
      }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    // 404 is already collapsed to `null` at the API layer; any throw here
    // is a real failure — no retry storm.
    retry: false,
  });

  return {
    /** `null` when the scoreset has no scoreable variants for distribution. */
    payload: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
