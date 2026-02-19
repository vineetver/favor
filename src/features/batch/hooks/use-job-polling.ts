"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { getJobStatus } from "../api";
import type { Job } from "../types";

interface UseJobPollingOptions {
  jobId: string | null;
  tenantId: string;
  enabled?: boolean;
  onComplete?: (job: Job) => void;
  onFailed?: (job: Job) => void;
}

interface UseJobPollingResult {
  job: Job | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for polling job status.
 *
 * Uses server-suggested poll intervals when available (poll.after_ms)
 */
export function useJobPolling({
  jobId,
  tenantId,
  enabled = true,
  onComplete,
  onFailed,
}: UseJobPollingOptions): UseJobPollingResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["batch-job", jobId, tenantId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");

      // Always request with URLs - backend will include them when job is complete
      const job = await getJobStatus(jobId, tenantId, true);

      return job;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;

      // Stop polling when job reaches terminal state
      if (data?.is_terminal) {
        return false;
      }

      // Use server-suggested poll interval if available
      if (data && "poll" in data && data.poll) {
        return data.poll.after_ms;
      }

      // Default fallback - 10 seconds to avoid rate limits
      return 10000;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Handle completion/failure callbacks
  useEffect(() => {
    if (!query.data) return;

    if (query.data.state === "COMPLETED") {
      onComplete?.(query.data);
    } else if (query.data.state === "FAILED" || query.data.state === "CANCELLED") {
      onFailed?.(query.data);
    }
  }, [query.data?.state, query.data, onComplete, onFailed]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["batch-job", jobId] });
  }, [queryClient, jobId]);

  return {
    job: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch,
  };
}
