import type { CohortStatusResponse } from "@features/batch/types";
import { classifyApiError } from "../tools/run/error-classify";
import { API_BASE } from "./constants";
const DEFAULT_TIMEOUT = 30_000; // 30s per tool call

// ---------------------------------------------------------------------------
// FNV-1a hash for deterministic idempotency keys
// ---------------------------------------------------------------------------

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function idempotencyKey(path: string, body: unknown): string {
  return fnv1a(path + (body ? JSON.stringify(body) : ""));
}

/**
 * Agent-facing error that returns structured messages the LLM can reason about.
 */
class AgentToolError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly recoveryHint?: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "AgentToolError";
  }

  /** Return an LLM-readable object instead of throwing into the void */
  toToolResult() {
    return {
      error: true,
      status: this.status,
      message: this.detail,
      ...(this.recoveryHint ? { hint: this.recoveryHint } : {}),
    };
  }
}

/** Parse API error into actionable hint for the LLM */
function parseErrorHint(status: number, body: string): string | undefined {
  return classifyApiError(status, body).hint;
}

const MAX_RETRIES = 2;
const BACKOFF_MS = [500, 1000];

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function agentFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; timeout?: number },
): Promise<T> {
  const idemKey = idempotencyKey(path, options?.body);
  let lastError: unknown;

  // Server-side: forward cookies from the incoming Next.js request
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Idempotency-Key": idemKey,
  };
  if (typeof window === "undefined") {
    let inRequestContext = false;
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      inRequestContext = true;
      const cookieStr = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
      if (cookieStr) headers["Cookie"] = cookieStr;
    } catch {
      // Not in a Next.js request context (standalone script, eval, etc.)
      // — fall back to API key so scripts can authenticate
      if (process.env.FAVOR_API_KEY) {
        headers["Authorization"] = `Bearer ${process.env.FAVOR_API_KEY}`;
      }
    }
    // In a request context, cookies are the only auth mechanism.
    // Never fall back to the server API key for web requests.
    void inRequestContext;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options?.timeout ?? DEFAULT_TIMEOUT,
    );

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: options?.method ?? "GET",
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        // Redirect to login on 401
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = `${API_BASE}/auth/login?return_to=${encodeURIComponent(window.location.href)}`;
          // Return a never-resolving promise to prevent further execution
          return new Promise<T>(() => {});
        }

        const body = await res.text();
        const hint = parseErrorHint(res.status, body);
        const err = new AgentToolError(res.status, body.slice(0, 500), hint);

        // Retry on 429 / 5xx, throw immediately on 4xx client errors
        if (isRetryable(res.status) && attempt < MAX_RETRIES) {
          lastError = err;
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        throw err;
      }

      const text = await res.text();
      if (!text) return undefined as T; // empty response (204-like)
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AgentToolError(
          502,
          `Unexpected non-JSON response from ${path}: ${text.slice(0, 200)}`,
          "The upstream API returned an invalid response. Try again.",
        );
      }
    } catch (err) {
      if (err instanceof AgentToolError) throw err;

      // Retry on timeouts
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < MAX_RETRIES) {
          lastError = err;
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
          continue;
        }
        throw new AgentToolError(408, "Request timed out", "Try a simpler query or reduce the limit.");
      }

      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Should not reach here, but satisfy TS
  if (lastError instanceof AgentToolError) throw lastError;
  throw lastError;
}

/** Cohort calls (tenant identity comes from session cookie) */
export function cohortFetch<T>(
  path: string,
  options?: Parameters<typeof agentFetch>[1],
) {
  return agentFetch<T>(path, options);
}

// ---------------------------------------------------------------------------
// Async cohort helpers
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Poll a cohort until it reaches a terminal state.
 * Uses GET /cohorts/{id}/status (lightweight).
 */
export async function pollCohortUntilReady(
  cohortId: string,
): Promise<CohortStatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await agentFetch<CohortStatusResponse>(
      `/cohorts/${cohortId}/status`,
    );
    if (status.is_terminal) return status;
    await new Promise((r) =>
      setTimeout(r, status.poll_hint_ms ?? POLL_INTERVAL_MS),
    );
  }

  throw new AgentToolError(
    408,
    `Cohort ${cohortId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`,
    "The cohort is still processing. Try again later.",
  );
}

// ---------------------------------------------------------------------------
// Analytics run helpers
// ---------------------------------------------------------------------------

const ANALYTICS_POLL_INTERVAL_MS = 2_000;
const ANALYTICS_POLL_TIMEOUT_MS = 180_000; // 3 min

/** Raw response from GET /cohorts/{id}/analytics/runs/{run_id} */
interface AnalyticsRunRaw {
  id: string;
  cohort_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  task_type?: string;
  progress?: { stage: string; percent: number };
  // Completed runs: result may be nested under `result` or flat on the object
  result?: {
    metrics?: Record<string, unknown>;
    summary?: string;
    viz_charts?: Array<{ chart_id: string; chart_type: string; title?: string }>;
    artifacts?: unknown[];
  };
  // Some backends put these flat
  metrics?: Record<string, unknown>;
  summary?: string;
  viz_charts?: Array<{ chart_id: string; chart_type: string; title?: string }>;
  // Failed runs: error fields
  error_message?: string;
  error_code?: string;
  error?: string; // legacy fallback
}

/** Flattened status returned to tool consumers */
export interface AnalyticsRunStatus {
  run_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  metrics?: Record<string, unknown>;
  summary?: string;
  viz_charts?: Array<{ chart_id: string; chart_type: string; title?: string }>;
  error?: string;
}

export interface AnalyticsChartData {
  chart_id: string;
  chart_type: string;
  title?: string;
  data: unknown;
}

/** Flatten the raw run response into a tool-friendly shape */
function flattenRunStatus(raw: AnalyticsRunRaw): AnalyticsRunStatus {
  return {
    run_id: raw.id,
    status: raw.status,
    metrics: raw.result?.metrics ?? raw.metrics,
    summary: raw.result?.summary ?? raw.summary,
    viz_charts: raw.result?.viz_charts ?? raw.viz_charts,
    error: raw.error_message ?? raw.error,
  };
}

/**
 * Poll an analytics run until it reaches a terminal state.
 */
export async function pollAnalyticsRun(
  cohortId: string,
  runId: string,
): Promise<AnalyticsRunStatus> {
  const deadline = Date.now() + ANALYTICS_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const raw = await cohortFetch<AnalyticsRunRaw>(
      `/cohorts/${encodeURIComponent(cohortId)}/analytics/runs/${encodeURIComponent(runId)}`,
    );
    if (raw.status === "completed" || raw.status === "failed" || raw.status === "cancelled") {
      return flattenRunStatus(raw);
    }
    await new Promise((r) => setTimeout(r, ANALYTICS_POLL_INTERVAL_MS));
  }

  throw new AgentToolError(
    408,
    `Analytics run ${runId} did not complete within ${ANALYTICS_POLL_TIMEOUT_MS / 1000}s`,
    "The analytics run is still processing. Try again later.",
  );
}

/**
 * Fetch chart visualization data for a completed analytics run.
 */
export async function fetchAnalyticsChart(
  cohortId: string,
  runId: string,
  chartId: string,
): Promise<AnalyticsChartData> {
  return cohortFetch<AnalyticsChartData>(
    `/cohorts/${encodeURIComponent(cohortId)}/analytics/runs/${encodeURIComponent(runId)}/viz?chart_id=${encodeURIComponent(chartId)}`,
  );
}

export { AgentToolError };
