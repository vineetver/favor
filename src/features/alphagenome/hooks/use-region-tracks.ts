"use client";

import { useQuery } from "@tanstack/react-query";
import { predictRegion } from "../api";
import type { Modality } from "../types";

interface UseRegionTracksOptions {
  chromosome: string;
  start: number;
  end: number;
  modalities: Modality[] | null; // null = not yet requested
}

/**
 * On-demand region predictions for gene/locus views.
 * Pass modalities: null initially; set to an array when user clicks "Predict".
 */
export function useRegionTracks({
  chromosome,
  start,
  end,
  modalities,
}: UseRegionTracksOptions) {
  const query = useQuery({
    queryKey: ["alphagenome-region", chromosome, start, end, modalities],
    queryFn: () =>
      predictRegion({
        chromosome,
        start,
        end,
        modalities: modalities!,
      }),
    enabled: modalities !== null,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    data: query.data?.data,
    cached: query.data?.cached ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
