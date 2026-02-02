"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  cancelBatchJob,
  createBatchJob,
  getBatchJobStatus,
  isTerminalState,
} from "../api";
import { DEFAULT_TENANT_ID, JOB_POLL_INTERVAL_MS } from "../config";
import type {
  BatchJobStatusResponse,
  CreateBatchJobRequest,
  InputFormat,
  KeyType,
} from "../types";

interface UseBatchJobOptions {
  tenantId?: string;
  onJobCreated?: (jobId: string) => void;
  onJobCompleted?: (job: BatchJobStatusResponse) => void;
  onJobFailed?: (job: BatchJobStatusResponse) => void;
  onError?: (error: Error) => void;
}

interface CreateJobOptions {
  inputUri: string;
  format?: InputFormat;
  keyType?: KeyType;
  hasHeader?: boolean;
  delimiter?: string;
  fields?: string[];
  includeNotFound?: boolean;
  idempotencyKey?: string;
}

interface UseBatchJobResult {
  createJob: (options: CreateJobOptions) => Promise<string>;
  cancelJob: (reason?: string) => Promise<void>;
  jobId: string | null;
  jobStatus: BatchJobStatusResponse | null;
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
    mutationFn: createBatchJob,
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
      cancelBatchJob(jobId, tenantId, reason),
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
      const status = await getBatchJobStatus(
        jobId,
        tenantId,
        // Include URLs only when job is completed
        false,
      );

      // Check for terminal states and fetch with URLs if completed
      if (status.state === "COMPLETED") {
        const completeStatus = await getBatchJobStatus(jobId, tenantId, true);
        onJobCompleted?.(completeStatus);
        return completeStatus;
      }

      if (status.state === "FAILED" || status.state === "CANCELLED") {
        onJobFailed?.(status);
      }

      return status;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling when job reaches terminal state
      if (data && isTerminalState(data.state)) {
        return false;
      }
      return JOB_POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch for polling
  });

  // Create job function
  const createJob = useCallback(
    async (opts: CreateJobOptions): Promise<string> => {
      const request: CreateBatchJobRequest = {
        tenant_id: tenantId,
        input_uri: opts.inputUri,
        format: opts.format,
        key_type: opts.keyType,
        has_header: opts.hasHeader,
        delimiter: opts.delimiter,
        fields: opts.fields,
        include_not_found: opts.includeNotFound,
        idempotency_key: opts.idempotencyKey,
      };

      const response = await createMutation.mutateAsync(request);
      return response.job_id;
    },
    [tenantId, createMutation],
  );

  // Cancel job function
  const cancelJob = useCallback(
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
    createJob,
    cancelJob,
    jobId,
    jobStatus: jobStatusQuery.data ?? null,
    isCreating: createMutation.isPending,
    isPolling: jobStatusQuery.isFetching && !isTerminalState(jobStatusQuery.data?.state ?? ""),
    isCancelling: cancelMutation.isPending,
    error: error || (jobStatusQuery.error instanceof Error ? jobStatusQuery.error : null),
    reset,
  };
}
