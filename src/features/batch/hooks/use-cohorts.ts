"use client";

import { useQuery } from "@tanstack/react-query";
import { listCohorts } from "../api";
import type { CohortListItem, CohortStatus } from "../types";

interface UseCohortsOptions {
  statusFilter?: CohortStatus;
}

interface UseCohortsResult {
  cohorts: CohortListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to list cohorts from the API, replacing localStorage-based job tracking.
 * Refetches every 5s when there are non-terminal cohorts.
 */
export function useCohorts(options: UseCohortsOptions = {}): UseCohortsResult {
  const { statusFilter } = options;

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

      // Refetch if any cohorts are non-terminal
      const hasActive = data.cohorts.some(
        (c) =>
          c.status === "queued" ||
          c.status === "running" ||
          c.status === "materializing" ||
          c.status === "validating",
      );
      return hasActive ? 5000 : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Exclude derived cohorts — they have no job data and can't be viewed directly.
  // Derived cohorts are accessed via their parent cohort instead.
  const cohorts = (query.data?.cohorts ?? []).filter(
    (c) => c.source !== "derived",
  );

  return {
    cohorts,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => query.refetch(),
  };
}
