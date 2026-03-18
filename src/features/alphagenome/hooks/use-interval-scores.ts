"use client";

import { useQuery } from "@tanstack/react-query";
import { predictIntervalScores } from "../api";
import type {
  IntervalAggregation,
  IntervalOutput,
  IntervalScorerKey,
  IntervalWidth,
} from "../types";

interface UseIntervalScoresOptions {
  chromosome: string;
  start: number;
  end: number;
  scorers?: IntervalScorerKey[];
  requestedOutput?: IntervalOutput;
  width?: IntervalWidth;
  aggregationType?: IntervalAggregation;
  enabled?: boolean;
}

export function useIntervalScores({
  chromosome,
  start,
  end,
  scorers,
  requestedOutput,
  width,
  aggregationType,
  enabled = false,
}: UseIntervalScoresOptions) {
  const query = useQuery({
    queryKey: [
      "alphagenome-interval-scores",
      chromosome,
      start,
      end,
      scorers,
      requestedOutput,
      width,
      aggregationType,
    ],
    queryFn: ({ signal }) =>
      predictIntervalScores(
        {
          chromosome,
          start,
          end,
          ...(scorers && { scorers }),
          ...(requestedOutput && { requested_output: requestedOutput }),
          ...(width && { width }),
          ...(aggregationType && { aggregation_type: aggregationType }),
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
