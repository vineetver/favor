"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { getJobStatus, isTerminalState } from "../api";
import { updateJobStatus } from "../lib/job-storage";
import type { JobStatusResponse } from "../types";

const POLL_INTERVAL = 10000; // 10 seconds - backend updates every 10s

interface UseJobPollingOptions {
  jobId: string | null;
  tenantId: string;
  enabled?: boolean;
  onComplete?: (job: JobStatusResponse) => void;
  onFailed?: (job: JobStatusResponse) => void;
}

interface UseJobPollingResult {
  job: JobStatusResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for polling job status with automatic updates to localStorage
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

      // Update localStorage with latest state
      updateJobStatus(jobId, job.state, job.progress);

      return job;
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && isTerminalState(data.state)) {
        return false;
      }
      return POLL_INTERVAL;
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
