"use client";

import { useQuery } from "@tanstack/react-query";
import { predictVariantTracks } from "../api";
import type { Modality, ParsedVcf } from "../types";

interface UseVariantTracksOptions {
  parsed: ParsedVcf;
  modalities: Modality[] | null; // null = not yet requested
}

/**
 * On-demand variant track predictions.
 * Pass modalities: null initially; set to an array when user clicks "Predict".
 */
export function useVariantTracks({
  parsed,
  modalities,
}: UseVariantTracksOptions) {
  const query = useQuery({
    queryKey: ["alphagenome-tracks", parsed.chromosome, parsed.position, parsed.ref, parsed.alt, modalities],
    queryFn: () =>
      predictVariantTracks({
        ...parsed,
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
