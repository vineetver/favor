"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCohorts } from "../api";
import type { CohortListItem, CohortListResponse, CohortStatus } from "../types";

interface UseCohortsOptions {
  statusFilter?: CohortStatus;
}

interface UseCohortsResult {
  cohorts: CohortListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Optimistically remove a cohort from the cache (call after delete). */
  removeFromCache: (id: string) => void;
}

/**
 * Hook to list cohorts from the API.
 * - Always refetches on mount and window focus (staleTime: 0)
 * - Polls every 5s while any cohort is non-terminal
 * - gcTime: 0 prevents stale data from persisting across navigations
 */
export function useCohorts(options: UseCohortsOptions = {}): UseCohortsResult {
  const { statusFilter } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["cohorts", statusFilter],
    queryFn: () =>
      listCohorts({
        status: statusFilter,
        limit: 100,
      }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;

      const hasActive = data.cohorts.some(
        (c) =>
          c.status === "queued" ||
          c.status === "running" ||
          c.status === "materializing" ||
          c.status === "validating",
      );
      return hasActive ? 5000 : false;
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    staleTime: 0,
    gcTime: 0, // Don't keep stale data across navigations
  });

  // Exclude derived cohorts — accessed via parent cohort instead.
  const cohorts = (query.data?.cohorts ?? []).filter(
    (c) => c.source !== "derived",
  );

  const removeFromCache = (id: string) => {
    // Optimistically remove from all cohort query caches
    queryClient.setQueriesData<CohortListResponse>(
      { queryKey: ["cohorts"] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          cohorts: old.cohorts.filter((c) => c.id !== id),
          count: old.count - 1,
        };
      },
    );
  };

  return {
    cohorts,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => query.refetch(),
    removeFromCache,
  };
}
