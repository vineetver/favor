/**
 * Batch Processing API Client
 *
 * Key design principle: Parse, don't validate
 * - Raw API responses are parsed at the boundary into discriminated unions
 * - Components receive strongly-typed Job objects where TypeScript enforces valid states
 */

import { handle401 } from "@infra/api/handle-auth-error";

import { API_BASE } from "@/config/api";
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
  TypedValidateResponse,
  ValidateRequest,
  ValidateResponse,
} from "../types";

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
// Share-link Error Codes
// ============================================================================

export type ShareErrorCode =
  | "SHARE_REVOKED"
  | "SHARE_EXPIRED"
  | "SHARE_INVALID"
  | "SHARE_SCOPE";

/**
 * Extract the share-link error code from a thrown error, if present.
 * Backend returns `{ code: "share_revoked" | ... }` on 403 from the share
 * middleware. Normalized to uppercase and narrowed to the known set.
 */
export function getShareErrorCode(err: unknown): ShareErrorCode | null {
  if (!(err instanceof BatchApiError)) return null;
  const details = err.details as
    | { code?: string; error?: { code?: string } }
    | undefined;
  const raw = details?.code ?? details?.error?.code;
  if (!raw || typeof raw !== "string") return null;
  const code = raw.toUpperCase();
  if (
    code === "SHARE_REVOKED" ||
    code === "SHARE_EXPIRED" ||
    code === "SHARE_INVALID" ||
    code === "SHARE_SCOPE"
  ) {
    return code;
  }
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a RequestInit with cookie credentials and, optionally, the share
 * token header. Use on any request that may be hit with a share token; the
 * session cookie is still required (share token does not stand alone).
 */
function withAuth(init: RequestInit = {}, shareToken?: string): RequestInit {
  const headers = new Headers(init.headers);
  if (shareToken) headers.set("X-Share-Token", shareToken);
  return { ...init, credentials: "include", headers };
}

function _getContentType(filename: string): string {
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

async function handleResponse<T>(
  response: Response,
  endpoint: string,
): Promise<T> {
  if (!response.ok) {
    if (handle401(response.status)) {
      return new Promise<T>(() => {}); // redirect in progress, never resolves
    }
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

      const delay = baseDelayMs * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Upload a file directly to the API (single request, no S3 presign needed).
 * Returns the input_uri for downstream cohort creation.
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
  onAborted?: (partialUri?: string) => void,
): Promise<{ input_uri: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();

    // Wire AbortSignal → XHR abort
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(
            new BatchApiError(
              xhr.status,
              "Invalid JSON response",
              "/cohorts/upload",
            ),
          );
        }
      } else {
        reject(
          new BatchApiError(
            xhr.status,
            xhr.responseText.slice(0, 500),
            "/cohorts/upload",
          ),
        );
      }
    });

    let networkErrored = false;

    xhr.addEventListener("error", () => {
      networkErrored = true;
      signal?.removeEventListener("abort", onAbort);
      reject(
        new BatchApiError(0, "Network error during upload", "/cohorts/upload"),
      );
    });

    xhr.addEventListener("abort", () => {
      signal?.removeEventListener("abort", onAbort);
      // Only notify for intentional aborts, not network error cascades
      if (!networkErrored) onAborted?.();
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
      } else {
        reject(new BatchApiError(0, "Upload was aborted", "/cohorts/upload"));
      }
    });

    const form = new FormData();
    // Sanitize multipart filename. The browser sets Content-Disposition
    // `filename="..."` from File.name as-is; some upstream parsers choke on
    // spaces and punctuation, producing cryptic "multipart/form-data parse
    // error" 400s even though the body is well-formed. Original file bytes
    // are unchanged — only the metadata label is replaced.
    const safeName =
      file.name.replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "") || "upload";
    form.append("file", file, safeName);

    xhr.open("POST", `${API_BASE}/cohorts/upload`);
    xhr.withCredentials = true;
    // Do NOT call xhr.setRequestHeader("Content-Type", …). The browser sets
    // `multipart/form-data; boundary=…` itself when you send a FormData body;
    // setting it manually strips the boundary and breaks parsing.
    xhr.send(form);
  });
}

/**
 * Step 3: Validate uploaded file (variant list mode)
 */
export async function validateFile(
  request: ValidateRequest,
): Promise<ValidateResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
    }).then((res) =>
      handleResponse<ValidateResponse>(res, "/cohorts/validate"),
    ),
  );
}

/**
 * Step 3 (alt): Validate uploaded file as typed cohort (GWAS, credible sets, fine mapping).
 * Same endpoint — backend discriminates based on detected content.
 * Returns typed validation with schema preview and column mapping suggestions.
 */
export async function validateTypedCohort(
  request: ValidateRequest,
  signal?: AbortSignal,
): Promise<TypedValidateResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(request),
      signal,
    }).then((res) =>
      handleResponse<TypedValidateResponse>(res, "/cohorts/validate"),
    ),
  );
}

/**
 * Get presigned URLs for all output files (data, resolution, enrichment parquets).
 */
export async function getCohortFiles(
  id: string,
  tenantId?: string,
  shareToken?: string,
): Promise<CohortFilesResponse> {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenant_id", tenantId);
  const qs = params.toString();
  return withRetry(() =>
    fetch(
      `${API_BASE}/cohorts/${encodeURIComponent(id)}/files${qs ? `?${qs}` : ""}`,
      withAuth({}, shareToken),
    ).then((res) =>
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
    fetch(`${API_BASE}/batch/enrichments`, { credentials: "include" }).then(
      (res) =>
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
export async function listCohorts(opts?: {
  status?: CohortStatus;
  source?: string;
  parent_id?: string;
  limit?: number;
  cursor?: string;
}): Promise<CohortListResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.parent_id) params.set("parent_id", opts.parent_id);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.cursor) params.set("cursor", opts.cursor);

  const qs = params.toString();
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    }).then((res) => handleResponse<CohortListResponse>(res, "/cohorts")),
  );
}

/**
 * Get full cohort metadata.
 * Pass includeUrls=true to get signed output URLs on completed cohorts.
 */
export async function getCohort(
  id: string,
  includeUrls = false,
  shareToken?: string,
): Promise<CohortDetail> {
  const params = new URLSearchParams();
  if (includeUrls) params.set("include_urls", "true");
  const qs = params.toString();
  return withRetry(() =>
    fetch(
      `${API_BASE}/cohorts/${id}${qs ? `?${qs}` : ""}`,
      withAuth({}, shareToken),
    ).then((res) => handleResponse<CohortDetail>(res, `/cohorts/${id}`)),
  );
}

/**
 * Lightweight cohort status polling endpoint.
 */
export async function getCohortStatus(
  id: string,
  shareToken?: string,
): Promise<CohortStatusResponse> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/status`, withAuth({}, shareToken)).then(
      (res) =>
        handleResponse<CohortStatusResponse>(res, `/cohorts/${id}/status`),
    ),
  );
}

/**
 * Delete (or cancel) a cohort.
 */
export async function deleteCohort(id: string): Promise<DeleteCohortResponse> {
  const res = await fetch(`${API_BASE}/cohorts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  // DELETE is idempotent — 404 means already gone.
  if (res.status === 404) {
    return { id, action: "deleted" };
  }

  return handleResponse<DeleteCohortResponse>(res, `/cohorts/${id}`);
}

/**
 * Get cohort summary (gene/consequence/clinical breakdowns + highlights).
 */
export async function getCohortSummary(id: string): Promise<CohortSummary> {
  return withRetry(() =>
    fetch(`${API_BASE}/cohorts/${id}/summary`, { credentials: "include" }).then(
      (res) => handleResponse<CohortSummary>(res, `/cohorts/${id}/summary`),
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
export async function cohortExport(id: string): Promise<CohortExportResponse> {
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
  available_methods?: Array<{
    method: string;
    category: string;
    description: string;
    available: boolean;
  }>;
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

// ============================================================================
// Cross-tenant Share Links
// ============================================================================

export interface CohortShare {
  share_id: string;
  cohort_id: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  token_prefix: string;
  label?: string | null;
}

export interface CreateShareRequest {
  /** 1..=90; backend enforces max 90d. Omit for backend default. */
  expires_in_days?: number;
  /** Free-form label shown in the owner's share list. */
  label?: string;
}

export interface CreateShareResponse {
  share_id: string;
  /** Raw token — `favor_share_<64 hex>`. Returned exactly once, never retrievable. */
  token: string;
  token_prefix: string;
  expires_at: string;
  label?: string | null;
}

/**
 * Create a new share link for a cohort. Owner-only; requires cohort to be
 * in a terminal state (backend returns 409 otherwise). Raw token appears
 * in the response exactly once — surface it immediately and do not persist.
 */
export async function createCohortShare(
  cohortId: string,
  request: CreateShareRequest = {},
): Promise<CreateShareResponse> {
  return fetch(
    `${API_BASE}/cohorts/${encodeURIComponent(cohortId)}/shares`,
    withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }),
  ).then((res) =>
    handleResponse<CreateShareResponse>(res, `/cohorts/${cohortId}/shares`),
  );
}

/**
 * List active and historical shares for a cohort. Backend returns a bare
 * array (not wrapped). No raw tokens — only `token_prefix` for display.
 */
export async function listCohortShares(
  cohortId: string,
): Promise<CohortShare[]> {
  return fetch(
    `${API_BASE}/cohorts/${encodeURIComponent(cohortId)}/shares`,
    withAuth(),
  ).then((res) =>
    handleResponse<CohortShare[]>(res, `/cohorts/${cohortId}/shares`),
  );
}

/**
 * Revoke a share link (soft-delete). Subsequent share-token requests for
 * this share_id will return 403 SHARE_REVOKED.
 */
export async function revokeCohortShare(
  cohortId: string,
  shareId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/cohorts/${encodeURIComponent(cohortId)}/shares/${encodeURIComponent(shareId)}`,
    withAuth({ method: "DELETE" }),
  );
  // DELETE is idempotent — 204 or 404 are both acceptable terminal states.
  if (!res.ok && res.status !== 404) {
    await handleResponse(res, `/cohorts/${cohortId}/shares/${shareId}`);
  }
}
