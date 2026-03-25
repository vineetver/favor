"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getCohort, getCohortStatus } from "../api";
import type { CohortDetail, Job } from "../types";
import { cohortDetailToJob } from "../types";

interface UseJobPollingOptions {
  jobId: string | null;
  enabled?: boolean;
  onComplete?: (job: Job) => void;
  onFailed?: (job: Job) => void;
}

interface UseJobPollingResult {
  job: Job | null;
  detail: CohortDetail | null;
  isLoading: boolean;
  error: Error | null;
  dataUpdatedAt: number;
  refetch: () => void;
}

/**
 * Two-phase polling hook:
 *   1. While running: poll lightweight GET /cohorts/{id}/status
 *   2. On terminal: fetch full GET /cohorts/{id}?include_urls=true once
 *
 * Returns both the legacy Job union (for existing card components)
 * and the raw CohortDetail (for anything that needs full backend data).
 *
 * IMPORTANT: When the job is terminal but the full detail hasn't loaded yet,
 * we return null for `job` rather than a broken synthesized object. This
 * prevents "unknown" filenames, NaN durations, and wrong stage displays.
 */
export function useJobPolling({
  jobId,
  enabled = true,
  onComplete,
  onFailed,
}: UseJobPollingOptions): UseJobPollingResult {
  const queryClient = useQueryClient();

  // Phase 1: Lightweight status polling
  const statusQuery = useQuery({
    queryKey: ["cohort-status", jobId],
    queryFn: () => getCohortStatus(jobId!),
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.is_terminal) return false;
      return data?.poll_hint_ms ?? 2000;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  const isTerminal = statusQuery.data?.is_terminal ?? false;

  // Phase 2: Full detail — fetched once when terminal (for output URLs, timing, etc.)
  const detailQuery = useQuery({
    queryKey: ["cohort-detail", jobId],
    queryFn: () => getCohort(jobId!, true),
    enabled: enabled && !!jobId && isTerminal,
    staleTime: 5 * 60 * 1000, // 5 min — presigned URLs are valid for 1hr
    gcTime: 0,
  });

  // Build the Job from whichever source is available.
  // Priority: full detail (complete data) > synthesized from status (running only).
  // For terminal jobs, ONLY use full detail — synthesized data is too incomplete.
  const detail = detailQuery.data ?? null;
  const statusData = statusQuery.data;

  // Memoize to avoid creating new object references on every render.
  // The old code used `new Date().toISOString()` inline — new ref every render → infinite loops downstream.
  const job: Job | null = useMemo(() => {
    if (detail) {
      return cohortDetailToJob(detail);
    }
    if (statusData && !statusData.is_terminal) {
      return cohortDetailToJob({
        id: statusData.id,
        status: statusData.status,
        progress: statusData.progress ?? undefined,
        is_terminal: statusData.is_terminal,
        poll: { after_ms: statusData.poll_hint_ms ?? 2000, message: "Polling..." },
        source: "upload",
        attempt: 1,
        created_at: "",
        updated_at: "",
      } as CohortDetail);
    }
    // terminal but detail still loading → null → shows loading state
    return null;
  }, [detail, statusData]);

  // Lifecycle callbacks — only fire once per terminal state, and only with full detail.
  // Also invalidate quotas immediately so the quota bar reflects freed slots.
  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job || !detail) return;
    if (firedRef.current === job.job_id) return;
    if (job.state === "COMPLETED" || job.state === "FAILED" || job.state === "CANCELLED") {
      firedRef.current = job.job_id;
      queryClient.invalidateQueries({ queryKey: ["quotas"] });
      if (job.state === "COMPLETED") onComplete?.(job);
      else onFailed?.(job);
    }
  }, [job, detail, onComplete, onFailed, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["cohort-status", jobId] });
    queryClient.invalidateQueries({ queryKey: ["cohort-detail", jobId] });
  }, [queryClient, jobId]);

  return {
    job: job ?? null,
    detail,
    isLoading: statusQuery.isLoading || (isTerminal && detailQuery.isLoading),
    error: statusQuery.error instanceof Error ? statusQuery.error : null,
    dataUpdatedAt: detailQuery.dataUpdatedAt || statusQuery.dataUpdatedAt,
    refetch,
  };
}
