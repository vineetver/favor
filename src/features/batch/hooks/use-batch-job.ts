"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { cancelJob, createJob, getJobStatus, isTerminalState } from "../api";
import { DEFAULT_TENANT_ID, JOB_POLL_INTERVAL_MS } from "../config";
import type { CreateJobRequest, InputFormat, Job, KeyType } from "../types";

interface UseBatchJobOptions {
  tenantId?: string;
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
 * Hook for managing batch job lifecycle: creation, polling, and cancellation
 */
export function useBatchJob(options: UseBatchJobOptions = {}): UseBatchJobResult {
  const {
    tenantId = DEFAULT_TENANT_ID,
    onJobCreated,
    onJobCompleted,
    onJobFailed,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Create job mutation
  const createMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (data) => {
      setJobId(data.job_id);
      onJobCreated?.(data.job_id);
    },
    onError: (err) => {
      const jobError = err instanceof Error ? err : new Error("Failed to create job");
      setError(jobError);
      onError?.(jobError);
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) =>
      cancelJob(jobId, tenantId, reason),
    onSuccess: () => {
      // Invalidate the job status query to trigger a refresh
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

  // Poll job status
  const jobStatusQuery = useQuery({
    queryKey: ["batch-job", jobId, tenantId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID");
      const job = await getJobStatus(
        jobId,
        tenantId,
        // Include URLs only when job is completed
        false,
      );

      // Check for terminal states and fetch with URLs if completed
      if (job.state === "COMPLETED") {
        const completeJob = await getJobStatus(jobId, tenantId, true);
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
      // Stop polling when job reaches terminal state
      if (data?.is_terminal) {
        return false;
      }
      // Use server-suggested poll interval if available
      if (data && "poll" in data && data.poll) {
        return data.poll.after_ms;
      }
      return JOB_POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch for polling
  });

  // Create job function
  const createJobFn = useCallback(
    async (opts: CreateJobOptions): Promise<string> => {
      const request: CreateJobRequest = {
        tenant_id: tenantId,
        input_uri: opts.inputUri,
        format: opts.format,
        key_type: opts.keyType,
        has_header: opts.hasHeader,
        delimiter: opts.delimiter,
        include_not_found: opts.includeNotFound,
        idempotency_key: opts.idempotencyKey,
      };

      const response = await createMutation.mutateAsync(request);
      return response.job_id;
    },
    [tenantId, createMutation],
  );

  // Cancel job function
  const cancelJobFn = useCallback(
    async (reason?: string): Promise<void> => {
      if (!jobId) {
        throw new Error("No job to cancel");
      }
      await cancelMutation.mutateAsync({ jobId, reason });
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
