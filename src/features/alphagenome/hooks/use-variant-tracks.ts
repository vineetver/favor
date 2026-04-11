"use client";

import { useQuery } from "@tanstack/react-query";
import { predictVariantTracks } from "../api";
import type { Modality, ParsedVcf, TissueGroup } from "../types";

interface UseVariantTracksOptions {
  parsed: ParsedVcf;
  modalities: Modality[] | null; // null = not yet requested
  tissueGroups?: TissueGroup[];
}

/**
 * On-demand variant track predictions.
 * Pass modalities: null initially; set to an array when user clicks "Predict".
 * Optional tissueGroups filters which tissue tracks are returned.
 */
export function useVariantTracks({
  parsed,
  modalities,
  tissueGroups,
}: UseVariantTracksOptions) {
  const query = useQuery({
    queryKey: [
      "alphagenome-tracks",
      parsed.chromosome,
      parsed.position,
      parsed.ref,
      parsed.alt,
      modalities,
      tissueGroups,
    ],
    queryFn: ({ signal }) =>
      predictVariantTracks(
        {
          ...parsed,
          modalities: modalities!,
          ...(tissueGroups?.length ? { tissue_groups: tissueGroups } : {}),
        },
        signal,
      ),
    enabled: modalities !== null,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
