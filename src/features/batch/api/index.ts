/**
 * Batch Processing API Client
 *
 * Key design principle: Parse, don't validate
 * - Raw API responses are parsed at the boundary into discriminated unions
 * - Components receive strongly-typed Job objects where TypeScript enforces valid states
 */

import type {
  CohortAggregateRequest,
  CohortDeriveRequest,
  CohortDetail,
  CohortExportResponse,
  CohortFilesResponse,
  CohortListResponse,
  CohortStatus,
  CohortStatusResponse,
  CohortSummary,
  CohortTopKRequest,
  CreateCohortRequest,
  CreateCohortResponse,
  DeleteCohortResponse,
  EnrichmentDiscoveryResponse,
  JobState,
  PresignRequest,
  PresignResponse,
  TypedValidateResponse,
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
    parquet: "application/x-parquet",
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
// API Functions
// ============================================================================

/**
 * Step 1: Get presigned URL for file upload
 */
export async function presignUpload(request: PresignRequest): Promise<PresignResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/presign-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...request,
        content_type: request.content_type || getContentType(request.filename),
      }),
    }).then((res) => handleResponse<PresignResponse>(res, "/cohorts/presign-upload")),
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
 * Step 3: Validate uploaded file (variant list mode)
 */
export async function validateFile(request: ValidateRequest): Promise<ValidateResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse<ValidateResponse>(res, "/cohorts/validate")),
  );
}

/**
 * Step 3 (alt): Validate uploaded file as typed cohort (GWAS, credible sets, fine mapping).
 * Same endpoint — backend discriminates based on detected content.
 * Returns typed validation with schema preview and column mapping suggestions.
 */
export async function validateTypedCohort(request: ValidateRequest): Promise<TypedValidateResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse<TypedValidateResponse>(res, "/cohorts/validate")),
  );
}

/**
 * Get presigned URLs for all output files (data, resolution, enrichment parquets).
 */
export async function getCohortFiles(
  id: string,
  tenantId?: string,
): Promise<CohortFilesResponse> {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenant_id", tenantId);
  const qs = params.toString();
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${encodeURIComponent(id)}/files${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    }).then((res) =>
      handleResponse<CohortFilesResponse>(res, `/cohorts/${id}/files`),
    ),
  );
}

/**
 * Fetch distinct tissue groups.
 */
export async function fetchTissueGroups(): Promise<string[]> {
  const data = await withRetry(() =>
    fetch(`${API_BASE}/tissues`, { credentials: "include" }).then((res) =>
      handleResponse<Array<{ tissue_group: string }>>(res, "/tissues"),
    ),
  );
  return [...new Set(data.map((t) => t.tissue_group))].sort();
}

/**
 * Fetch available enrichment analyses and exportable tables.
 */
export async function fetchEnrichmentOptions(): Promise<EnrichmentDiscoveryResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/batch/enrichments`, { credentials: "include" }).then((res) =>
      handleResponse<EnrichmentDiscoveryResponse>(res, "/batch/enrichments"),
    ),
  );
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
  request: CreateCohortRequest,
): Promise<CreateCohortResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse<CreateCohortResponse>(res, "/cohorts")),
  );
}

/**
 * List cohorts with optional status filter and cursor pagination.
 */
export async function listCohorts(
  opts?: { status?: CohortStatus; source?: string; parent_id?: string; limit?: number; cursor?: string },
): Promise<CohortListResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.parent_id) params.set("parent_id", opts.parent_id);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const qs = params.toString();
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts${qs ? `?${qs}` : ""}`, { credentials: "include" }).then((res) =>
      handleResponse<CohortListResponse>(res, "/cohorts"),
    ),
  );
}

/**
 * Get full cohort metadata.
 * Pass includeUrls=true to get signed output URLs on completed cohorts.
 */
export async function getCohort(
  id: string,
  includeUrls = false,
): Promise<CohortDetail> {
  const params = new URLSearchParams();
  if (includeUrls) params.set("include_urls", "true");
  const qs = params.toString();
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}${qs ? `?${qs}` : ""}`, { credentials: "include" }).then((res) =>
      handleResponse<CohortDetail>(res, `/cohorts/${id}`),
    ),
  );
}

/**
 * Lightweight cohort status polling endpoint.
 */
export async function getCohortStatus(
  id: string,
): Promise<CohortStatusResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/status`, { credentials: "include" }).then((res) =>
      handleResponse<CohortStatusResponse>(res, `/cohorts/${id}/status`),
    ),
  );
}

/**
 * Delete (or cancel) a cohort.
 */
export async function deleteCohort(
  id: string,
): Promise<DeleteCohortResponse> {
  return fetch(`${API_BASE}/cohorts/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then((res) => handleResponse<DeleteCohortResponse>(res, `/cohorts/${id}`));
}

/**
 * Get cohort summary (gene/consequence/clinical breakdowns + highlights).
 */
export async function getCohortSummary(
  id: string,
): Promise<CohortSummary> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/summary`, { credentials: "include" }).then((res) =>
      handleResponse<CohortSummary>(res, `/cohorts/${id}/summary`),
    ),
  );
}

/**
 * Top-K variants by a numeric score column.
 */
export async function cohortTopK(
  id: string,
  request: CohortTopKRequest,
): Promise<unknown> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/topk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/topk`)),
  );
}

/**
 * Aggregate cohort variants by a field.
 */
export async function cohortAggregate(
  id: string,
  request: CohortAggregateRequest,
): Promise<unknown> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/aggregate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/aggregate`)),
  );
}

/**
 * Derive a sub-cohort by filtering the parent.
 */
export async function cohortDerive(
  id: string,
  request: CohortDeriveRequest,
): Promise<unknown> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/derive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) => handleResponse(res, `/cohorts/${id}/derive`)),
  );
}

/**
 * Export cohort as Arrow IPC.
 */
export async function cohortExport(
  id: string,
): Promise<CohortExportResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/export`, {
      method: "POST",
      credentials: "include",
    }).then((res) =>
      handleResponse<CohortExportResponse>(res, `/cohorts/${id}/export`),
    ),
  );
}

// ============================================================================
// Analytics Runs
// ============================================================================

export interface AnalyticsRunListItem {
  id: string;
  cohort_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  task_type?: string;
  created_at?: string;
  viz_charts?: Array<{ chart_id: string; chart_type: string; title?: string }>;
}

interface AnalyticsRunListResponse {
  runs: AnalyticsRunListItem[];
  count: number;
}

/**
 * List analytics runs for a cohort.
 */
export async function listAnalyticsRuns(
  cohortId: string,
  opts?: { status?: string; limit?: number },
): Promise<AnalyticsRunListResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const qs = params.toString();

  return withRetry(() =>
    fetch(
      `${API_BASE}/cohorts/${encodeURIComponent(cohortId)}/analytics/runs${qs ? `?${qs}` : ""}`,
      { credentials: "include" },
    ).then((res) =>
      handleResponse<AnalyticsRunListResponse>(
        res,
        `/cohorts/${cohortId}/analytics/runs`,
      ),
    ),
  );
}

// ============================================================================
// Cohort Schema & Sample (client-side)
// ============================================================================

export interface SchemaColumn {
  name: string;
  kind: "numeric" | "categorical" | "identity" | "array" | "select";
  namespace?: string;
  role?: string;
}

export interface CohortSchemaResponse {
  row_count?: number;
  text_summary?: string;
  data_type?: string;
  columns?: SchemaColumn[];
  capabilities?: Record<string, boolean>;
  available_methods?: Array<{ method: string; category: string; description: string; available: boolean }>;
}

/**
 * Fetch cohort schema (columns, row count, data type).
 */
export async function getCohortSchemaClient(
  id: string,
): Promise<CohortSchemaResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${encodeURIComponent(id)}/schema`, {
      credentials: "include",
    }).then((res) =>
      handleResponse<CohortSchemaResponse>(res, `/cohorts/${id}/schema`),
    ),
  );
}

export interface CohortRowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  text_summary?: string;
}

/**
 * Fetch a sample of rows from a cohort.
 */
export async function getCohortSampleClient(
  id: string,
  opts?: { limit?: number; select?: string[] },
): Promise<CohortRowsResponse> {
  const body: Record<string, unknown> = {
    limit: opts?.limit ?? 10,
  };
  if (opts?.select?.length) body.select = opts.select;

  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${encodeURIComponent(id)}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).then((res) =>
      handleResponse<CohortRowsResponse>(res, `/cohorts/${id}/rows`),
    ),
  );
}
