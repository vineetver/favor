"use client";

import { useQuery } from "@tanstack/react-query";
import { getCohortStatus } from "../api";
import type { CohortStatusResponse } from "../types";

interface UseCohortPollingOptions {
  cohortId: string | null;
  enabled?: boolean;
}

interface UseCohortPollingResult {
  status: CohortStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Poll `GET /cohorts/{id}/status` until `is_terminal`.
 * Uses `poll_hint_ms` from response for interval.
 */
export function useCohortPolling({
  cohortId,
  enabled = true,
}: UseCohortPollingOptions): UseCohortPollingResult {
  const query = useQuery({
    queryKey: ["cohort-status", cohortId],
    queryFn: async () => {
      if (!cohortId) throw new Error("No cohort ID");
      return getCohortStatus(cohortId);
    },
    enabled: enabled && !!cohortId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.is_terminal) return false;
      return data?.poll_hint_ms ?? 2000;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
