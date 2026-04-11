"use client";

import { useQuery } from "@tanstack/react-query";
import { predictScores } from "../api";
import type { ParsedVcf, ScorerKey } from "../types";
import { DEFAULT_SCORERS } from "../utils";

interface UseScoresOptions {
  parsed: ParsedVcf;
  scorers?: ScorerKey[];
  enabled?: boolean;
}

export function useScores({
  parsed,
  scorers,
  enabled = true,
}: UseScoresOptions) {
  const effectiveScorers = scorers ?? DEFAULT_SCORERS;

  const query = useQuery({
    queryKey: [
      "alphagenome-scores",
      parsed.chromosome,
      parsed.position,
      parsed.ref,
      parsed.alt,
      effectiveScorers,
    ],
    queryFn: ({ signal }) =>
      predictScores(
        {
          ...parsed,
          scorers: effectiveScorers,
        },
        signal,
      ),
    enabled,
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
