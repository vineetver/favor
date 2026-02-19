/**
 * Batch Processing API Client
 *
 * Key design principle: Parse, don't validate
 * - Raw API responses are parsed at the boundary into discriminated unions
 * - Components receive strongly-typed Job objects where TypeScript enforces valid states
 */

import type {
  CancelResponse,
  CohortAggregateRequest,
  CohortDeriveRequest,
  CohortDetail,
  CohortExportResponse,
  CohortListResponse,
  CohortStatus,
  CohortStatusResponse,
  CohortSummary,
  CohortTopKRequest,
  CreateCohortRequest,
  CreateCohortResponse,
  CreateJobRequest,
  CreateJobResponse,
  DeleteCohortResponse,
  ErrorCode,
  Job,
  JobCancelled,
  JobCancelRequested,
  JobCompleted,
  JobEta,
  JobFailed,
  JobInput,
  JobOutput,
  JobPending,
  JobPollHint,
  JobProgress,
  JobRunning,
  JobState,
  JobTiming,
  PresignRequest,
  PresignResponse,
  ProcessingStage,
  ValidateRequest,
  ValidateResponse,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// ============================================================================
// Error Classes
// ============================================================================

export class BatchApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public endpoint: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "BatchApiError";
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const types: Record<string, string> = {
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    txt: "text/plain",
    vcf: "text/plain",
  };
  return types[ext || ""] || "application/octet-stream";
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let details: unknown;

    try {
      const body = await response.json();
      message = body.error?.message || body.message || message;
      details = body;
    } catch {
      // Response wasn't JSON
    }

    throw new BatchApiError(response.status, message, endpoint, details);
  }

  return response.json();
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Only retry on 503 or network errors
      const isRetryable =
        error instanceof BatchApiError
          ? error.status === 503
          : error instanceof TypeError; // Network error

      if (!isRetryable) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ============================================================================
// Job Parser (Parse, Don't Validate)
// ============================================================================

/**
 * Raw API response shape (loose types for parsing)
 */
interface RawJobResponse {
  job_id: string;
  state: string;
  is_terminal: boolean;
  can_cancel: boolean;
  attempt: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  input: JobInput;
  progress?: JobProgress | null;
  timing: JobTiming;
  output?: JobOutput | null;
  eta?: JobEta | null;
  poll?: JobPollHint | null;
  error_code?: string | null;
  error_message?: string | null;
  retryable?: boolean | null;
  db_version?: string | null;
}

/**
 * Parse raw API response into discriminated union.
 *
 * This is the boundary where we transform loose API data into
 * strongly-typed Job objects. After this point, TypeScript
 * enforces that each state has exactly the fields it needs.
 *
 * @throws Error if state is unknown
 */
export function parseJob(raw: RawJobResponse): Job {
  const base = {
    job_id: raw.job_id,
    attempt: raw.attempt,
    created_at: raw.created_at,
    input: raw.input,
    timing: raw.timing,
    db_version: raw.db_version ?? undefined,
  };

  // Default poll hint if not provided - 10 seconds to avoid rate limits
  const defaultPoll: JobPollHint = { after_ms: 10000, message: "Polling..." };

  switch (raw.state) {
    case "PENDING": {
      const job: JobPending = {
        ...base,
        state: "PENDING",
        is_terminal: false,
        can_cancel: true,
        poll: raw.poll ?? defaultPoll,
      };
      return job;
    }

    case "RUNNING": {
      if (!raw.progress) {
        throw new Error("RUNNING job must have progress");
      }
      if (!raw.started_at) {
        throw new Error("RUNNING job must have started_at");
      }
      const job: JobRunning = {
        ...base,
        state: "RUNNING",
        is_terminal: false,
        can_cancel: true,
        poll: raw.poll ?? defaultPoll,
        started_at: raw.started_at,
        progress: raw.progress,
        eta: raw.eta ?? undefined,
      };
      return job;
    }

    case "CANCEL_REQUESTED": {
      if (!raw.progress) {
        throw new Error("CANCEL_REQUESTED job must have progress");
      }
      if (!raw.started_at) {
        throw new Error("CANCEL_REQUESTED job must have started_at");
      }
      const job: JobCancelRequested = {
        ...base,
        state: "CANCEL_REQUESTED",
        is_terminal: false,
        can_cancel: false,
        started_at: raw.started_at,
        progress: raw.progress,
      };
      return job;
    }

    case "COMPLETED": {
      if (!raw.output) {
        throw new Error("COMPLETED job must have output");
      }
      if (!raw.progress) {
        throw new Error("COMPLETED job must have progress");
      }
      if (!raw.started_at) {
        throw new Error("COMPLETED job must have started_at");
      }
      if (!raw.completed_at) {
        throw new Error("COMPLETED job must have completed_at");
      }
      const job: JobCompleted = {
        ...base,
        state: "COMPLETED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at,
        completed_at: raw.completed_at,
        progress: raw.progress,
        output: raw.output,
      };
      return job;
    }

    case "FAILED": {
      if (!raw.completed_at) {
        throw new Error("FAILED job must have completed_at");
      }
      if (!raw.error_code) {
        throw new Error("FAILED job must have error_code");
      }
      if (raw.error_message === undefined || raw.error_message === null) {
        throw new Error("FAILED job must have error_message");
      }
      if (raw.retryable === undefined || raw.retryable === null) {
        throw new Error("FAILED job must have retryable");
      }
      const job: JobFailed = {
        ...base,
        state: "FAILED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at ?? undefined,
        completed_at: raw.completed_at,
        progress: raw.progress ?? undefined,
        error_code: raw.error_code as ErrorCode,
        error_message: raw.error_message,
        retryable: raw.retryable,
      };
      return job;
    }

    case "CANCELLED": {
      if (!raw.completed_at) {
        throw new Error("CANCELLED job must have completed_at");
      }
      const job: JobCancelled = {
        ...base,
        state: "CANCELLED",
        is_terminal: true,
        can_cancel: false,
        started_at: raw.started_at ?? undefined,
        completed_at: raw.completed_at,
        progress: raw.progress ?? undefined,
      };
      return job;
    }

    default:
      throw new Error(`Unknown job state: ${raw.state}`);
  }
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Step 1: Get presigned URL for file upload
 */
export async function presignUpload(request: PresignRequest): Promise<PresignResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/batch/presign-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        content_type: request.content_type || getContentType(request.filename),
      }),
    }).then((res) => handleResponse<PresignResponse>(res, "/batch/presign-upload")),
  );
}

/**
 * Step 2: Upload file directly to S3 using presigned URL
 */
export async function uploadFileToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new BatchApiError(xhr.status, `Upload failed`, "S3 Upload"));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new BatchApiError(0, "Network error during upload", "S3 Upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new BatchApiError(0, "Upload was aborted", "S3 Upload"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", getContentType(file.name));
    xhr.send(file);
  });
}

/**
 * Step 3: Validate uploaded file
 */
export async function validateFile(request: ValidateRequest): Promise<ValidateResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/batch/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse<ValidateResponse>(res, "/batch/validate")),
  );
}

/**
 * Step 4: Create a batch job
 */
export async function createJob(request: CreateJobRequest): Promise<CreateJobResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse<CreateJobResponse>(res, "/batch")),
  );
}

/**
 * Step 5: Get job status
 *
 * Returns a discriminated union Job type where TypeScript
 * will narrow the type based on job.state
 */
export async function getJobStatus(
  jobId: string,
  tenantId: string,
  includeUrls = false,
): Promise<Job> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    include_urls: String(includeUrls),
  });

  const raw = await withRetry(() =>
    fetch(`${API_BASE}/batch/${jobId}?${params}`).then((res) =>
      handleResponse<RawJobResponse>(res, `/batch/${jobId}`),
    ),
  );

  return parseJob(raw);
}

/**
 * Cancel a running job
 */
export async function cancelJob(
  jobId: string,
  tenantId: string,
  reason?: string,
): Promise<CancelResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  if (reason) params.set("reason", reason);

  return fetch(`${API_BASE}/batch/${jobId}?${params}`, {
    method: "DELETE",
  }).then((res) => handleResponse<CancelResponse>(res, `/batch/${jobId}`));
}

// ============================================================================
// Utility Functions (Derive, don't store)
// ============================================================================

/**
 * Check if a job state is terminal (no more updates expected)
 * Prefer using job.is_terminal from the discriminated union
 */
export function isTerminalState(state: JobState): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELLED";
}

/**
 * Check if a job can be cancelled
 * Prefer using job.can_cancel from the discriminated union
 */
export function isCancellable(state: JobState): boolean {
  return state === "PENDING" || state === "RUNNING";
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: JobState): string {
  const descriptions: Record<JobState, string> = {
    PENDING: "Waiting in queue",
    RUNNING: "Processing variants",
    COMPLETED: "Completed successfully",
    FAILED: "Failed with error",
    CANCEL_REQUESTED: "Cancellation in progress",
    CANCELLED: "Cancelled by user",
  };
  return descriptions[state];
}

// ============================================================================
// Cohort API Functions
// ============================================================================

/**
 * Create a cohort from inline variant references.
 */
export async function createCohort(
  tenantId: string,
  request: CreateCohortRequest,
): Promise<CreateCohortResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse<CreateCohortResponse>(res, "/cohorts")),
  );
}

/**
 * List cohorts for a tenant with optional status filter and cursor pagination.
 */
export async function listCohorts(
  tenantId: string,
  opts?: { status?: CohortStatus; source?: string; parent_id?: string; limit?: number; cursor?: string },
): Promise<CohortListResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.parent_id) params.set("parent_id", opts.parent_id);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  return withRetry(() =>
    fetch(`${API_BASE}/cohorts?${params}`).then((res) =>
      handleResponse<CohortListResponse>(res, "/cohorts"),
    ),
  );
}

/**
 * Get full cohort metadata.
 */
export async function getCohort(
  id: string,
  tenantId: string,
): Promise<CohortDetail> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}?${params}`).then((res) =>
      handleResponse<CohortDetail>(res, `/cohorts/${id}`),
    ),
  );
}

/**
 * Lightweight cohort status polling endpoint.
 */
export async function getCohortStatus(
  id: string,
  tenantId: string,
): Promise<CohortStatusResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/status?${params}`).then((res) =>
      handleResponse<CohortStatusResponse>(res, `/cohorts/${id}/status`),
    ),
  );
}

/**
 * Delete (or cancel) a cohort.
 */
export async function deleteCohort(
  id: string,
  tenantId: string,
): Promise<DeleteCohortResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return fetch(`${API_BASE}/cohorts/${id}?${params}`, {
    method: "DELETE",
  }).then((res) => handleResponse<DeleteCohortResponse>(res, `/cohorts/${id}`));
}

/**
 * Get cohort summary (gene/consequence/clinical breakdowns + highlights).
 */
export async function getCohortSummary(
  id: string,
  tenantId: string,
): Promise<CohortSummary> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/summary?${params}`).then((res) =>
      handleResponse<CohortSummary>(res, `/cohorts/${id}/summary`),
    ),
  );
}

/**
 * Top-K variants by a numeric score column.
 */
export async function cohortTopK(
  id: string,
  tenantId: string,
  request: CohortTopKRequest,
): Promise<unknown> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/topk?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/topk`)),
  );
}

/**
 * Aggregate cohort variants by a field.
 */
export async function cohortAggregate(
  id: string,
  tenantId: string,
  request: CohortAggregateRequest,
): Promise<unknown> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/aggregate?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/aggregate`)),
  );
}

/**
 * Derive a sub-cohort by filtering the parent.
 */
export async function cohortDerive(
  id: string,
  tenantId: string,
  request: CohortDeriveRequest,
): Promise<unknown> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/derive?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/derive`)),
  );
}

/**
 * Export cohort as Arrow IPC.
 */
export async function cohortExport(
  id: string,
  tenantId: string,
): Promise<CohortExportResponse> {
  const params = new URLSearchParams({ tenant_id: tenantId });
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/export?${params}`, {
      method: "POST",
    }).then((res) =>
      handleResponse<CohortExportResponse>(res, `/cohorts/${id}/export`),
    ),
  );
}
