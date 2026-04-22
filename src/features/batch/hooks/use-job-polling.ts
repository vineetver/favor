"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getCohort, getCohortStatus } from "../api";
import type { CohortDetail, Job } from "../types";
import { cohortDetailToJob } from "../types";

interface UseJobPollingOptions {
  jobId: string | null;
  enabled?: boolean;
  /**
   * Share-link token for cross-tenant read access. When set, forwarded as
   * `X-Share-Token` on the status + detail calls. Query keys are namespaced
   * by token so an owner and shared viewer never collide in the cache.
   */
  shareToken?: string | null;
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
  shareToken,
  onComplete,
  onFailed,
}: UseJobPollingOptions): UseJobPollingResult {
  const queryClient = useQueryClient();
  const token = shareToken ?? undefined;
  // Namespace cache keys so an owner and a share-scope viewer never share rows.
  const scope = token ? "shared" : "owner";

  // Phase 1: Lightweight status polling
  const statusQuery = useQuery({
    queryKey: ["cohort-status", jobId, scope],
    queryFn: () => getCohortStatus(jobId!, token),
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
    queryKey: ["cohort-detail", jobId, scope],
    queryFn: () => getCohort(jobId!, true, token),
    enabled: enabled && !!jobId && isTerminal,
    // Share-token viewers get short-TTL presigned URLs — refetch sooner.
    staleTime: token ? 60 * 1000 : 5 * 60 * 1000,
    gcTime: 0,
  });

  // Build the Job from whichever source is available.
  // Priority: full detail (complete data) > synthesized from status (running only).
  // For terminal jobs, ONLY use full detail — synthesized data is too incomplete.
  const detail = detailQuery.data ?? null;
  const statusData = statusQuery.data;

  const job: Job | null = useMemo(() => {
    if (detail) {
      return cohortDetailToJob(detail);
    }
    if (statusData) {
      // For both running and terminal statuses, synthesize from status so the
      // UI never gets stuck on a stale "running" card when detail is slow
      // or failing. A terminal synthesized job is incomplete (no output URL,
      // no timing), but CompletedJobCard handles missing fields gracefully
      // and the detail fetch will fill them in on the next tick.
      return cohortDetailToJob({
        id: statusData.id,
        status: statusData.status,
        progress: statusData.progress ?? undefined,
        is_terminal: statusData.is_terminal,
        poll: {
          after_ms: statusData.poll_hint_ms ?? 2000,
          message: "Polling...",
        },
        source: "upload",
        attempt: 1,
        created_at: "",
        updated_at: "",
      } as CohortDetail);
    }
    return null;
  }, [detail, statusData]);

  // Fire once per terminal state. Also invalidates quotas so the bar reflects freed slots.
  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job || !detail) return;
    if (firedRef.current === job.job_id) return;
    if (
      job.state === "COMPLETED" ||
      job.state === "FAILED" ||
      job.state === "CANCELLED"
    ) {
      firedRef.current = job.job_id;
      queryClient.invalidateQueries({ queryKey: ["quotas"] });
      if (job.state === "COMPLETED") onComplete?.(job);
      else onFailed?.(job);
    }
  }, [job, detail, onComplete, onFailed, queryClient]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["cohort-status", jobId, scope],
    });
    queryClient.invalidateQueries({
      queryKey: ["cohort-detail", jobId, scope],
    });
  }, [queryClient, jobId, scope]);

  return {
    job: job ?? null,
    detail,
    isLoading: statusQuery.isLoading || (isTerminal && detailQuery.isLoading),
    error:
      statusQuery.error instanceof Error
        ? statusQuery.error
        : detailQuery.error instanceof Error
          ? detailQuery.error
          : null,
    dataUpdatedAt: detailQuery.dataUpdatedAt || statusQuery.dataUpdatedAt,
    refetch,
  };
}
