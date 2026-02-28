"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { createCohort, deleteCohort, getCohort } from "../api";
import { JOB_POLL_INTERVAL_MS } from "../config";
import type { InputFormat, Job, KeyType } from "../types";
import { cohortDetailToJob } from "../types";

interface UseBatchJobOptions {
  onJobCreated?: (jobId: string) => void;
  onJobCompleted?: (job: Job) => void;
  onJobFailed?: (job: Job) => void;
  onError?: (error: Error) => void;
}

interface CreateJobOptions {
  inputUri: string;
  format?: InputFormat;
  keyType?: KeyType;
  hasHeader?: boolean;
  delimiter?: string;
  includeNotFound?: boolean;
  idempotencyKey?: string;
}

interface UseBatchJobResult {
  createJob: (options: CreateJobOptions) => Promise<string>;
  cancelJob: (reason?: string) => Promise<void>;
  jobId: string | null;
  job: Job | null;
  isCreating: boolean;
  isPolling: boolean;
  isCancelling: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook for managing batch job lifecycle: creation, polling, and cancellation.
 * Uses cohort API under the hood, maps to Job type for backward compat.
 */
export function useBatchJob(options: UseBatchJobOptions = {}): UseBatchJobResult {
  const {
    onJobCreated,
    onJobCompleted,
    onJobFailed,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Create cohort mutation (replaces createJob)
  const createMutation = useMutation({
    mutationFn: (request: Parameters<typeof createCohort>[0]) =>
      createCohort(request),
    onSuccess: (data) => {
      setJobId(data.id);
      onJobCreated?.(data.id);
    },
    onError: (err) => {
      const jobError = err instanceof Error ? err : new Error("Failed to create job");
      setError(jobError);
      onError?.(jobError);
    },
  });

  // Delete/cancel cohort mutation (replaces cancelJob)
  const cancelMutation = useMutation({
    mutationFn: ({ cohortId }: { cohortId: string }) =>
      deleteCohort(cohortId),
    onSuccess: () => {
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ["batch-job", jobId] });
      }
    },
    onError: (err) => {
      const cancelError = err instanceof Error ? err : new Error("Failed to cancel job");
      setError(cancelError);
      onError?.(cancelError);
    },
  });

  // Poll cohort status, map to Job
  const jobStatusQuery = useQuery({
    queryKey: ["batch-job", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const detail = await getCohort(jobId, false);
      const job = cohortDetailToJob(detail);

      // If completed, re-fetch with URLs
      if (job.state === "COMPLETED") {
        const completeDetail = await getCohort(jobId, true);
        const completeJob = cohortDetailToJob(completeDetail);
        onJobCompleted?.(completeJob);
        return completeJob;
      }

      if (job.state === "FAILED" || job.state === "CANCELLED") {
        onJobFailed?.(job);
      }

      return job;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.is_terminal) return false;
      if (data && "poll" in data && data.poll) {
        return data.poll.after_ms;
      }
      return JOB_POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Create job function (calls createCohort with source: "upload")
  const createJobFn = useCallback(
    async (opts: CreateJobOptions): Promise<string> => {
      const response = await createMutation.mutateAsync({
        source: "upload",
        input_uri: opts.inputUri,
        format: opts.format,
        key_type: opts.keyType,
        has_header: opts.hasHeader,
        delimiter: opts.delimiter,
        include_not_found: opts.includeNotFound,
        idempotency_key: opts.idempotencyKey,
      });
      return response.id;
    },
    [createMutation],
  );

  // Cancel job function (calls deleteCohort)
  const cancelJobFn = useCallback(
    async (_reason?: string): Promise<void> => {
      if (!jobId) {
        throw new Error("No job to cancel");
      }
      await cancelMutation.mutateAsync({ cohortId: jobId });
    },
    [jobId, cancelMutation],
  );

  // Reset function
  const reset = useCallback(() => {
    setJobId(null);
    setError(null);
    createMutation.reset();
    cancelMutation.reset();
    if (jobId) {
      queryClient.removeQueries({ queryKey: ["batch-job", jobId] });
    }
  }, [jobId, createMutation, cancelMutation, queryClient]);

  return {
    createJob: createJobFn,
    cancelJob: cancelJobFn,
    jobId,
    job: jobStatusQuery.data ?? null,
    isCreating: createMutation.isPending,
    isPolling: jobStatusQuery.isFetching && !jobStatusQuery.data?.is_terminal,
    isCancelling: cancelMutation.isPending,
    error: error || (jobStatusQuery.error instanceof Error ? jobStatusQuery.error : null),
    reset,
  };
}
