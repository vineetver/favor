/**
 * Batch Processing API Client
 * Production-grade implementation with retry logic and proper error handling
 */

import type {
  CancelResponse,
  CreateJobRequest,
  CreateJobResponse,
  JobState,
  JobStatusResponse,
  PresignRequest,
  PresignResponse,
  ValidateRequest,
  ValidateResponse,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

// ============ Error Classes ============

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

// ============ Helper Functions ============

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

// ============ API Functions ============

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
 */
export async function getJobStatus(
  jobId: string,
  tenantId: string,
  includeUrls = false,
): Promise<JobStatusResponse> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    include_urls: String(includeUrls),
  });

  return withRetry(() =>
    fetch(`${API_BASE}/batch/${jobId}?${params}`).then((res) =>
      handleResponse<JobStatusResponse>(res, `/batch/${jobId}`),
    ),
  );
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

// ============ Utility Functions ============

/**
 * Check if a job state is terminal (no more updates expected)
 */
export function isTerminalState(state: JobState): boolean {
  return state === "COMPLETED" || state === "FAILED" || state === "CANCELLED";
}

/**
 * Check if a job can be cancelled
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
