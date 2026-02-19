import { getJobStatus } from "@features/batch/api";
import type { Job } from "@features/batch/types";
import type { CohortStatusResponse, CohortSummary } from "@features/batch/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
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
  if (status === 400) {
    if (body.includes("score")) return "Check the score column name — see Score Columns list.";
    if (body.includes("filter")) return "Check the filter format — use score_above/score_below with a valid field.";
    if (body.includes("entity") || body.includes("not found"))
      return "Entity not found. Try searchEntities to find the correct ID.";
    return "Bad request — check the parameters.";
  }
  if (status === 404) return "Resource not found. Verify the ID exists.";
  if (status === 429) return "Rate limited. Wait a moment, then retry.";
  if (status >= 500) return "Server error — try again or use an alternative approach.";
  return undefined;
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

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options?.timeout ?? DEFAULT_TIMEOUT,
    );

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: options?.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idemKey,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
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

      return res.json();
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

/** Cohort calls need tenant_id */
export function cohortFetch<T>(
  path: string,
  options?: Parameters<typeof agentFetch>[1],
) {
  const separator = path.includes("?") ? "&" : "?";
  return agentFetch<T>(
    `${path}${separator}tenant_id=default-tenant`,
    options,
  );
}

// ---------------------------------------------------------------------------
// Async cohort helpers
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

/**
 * Poll a batch job until it reaches a terminal state.
 * Returns the terminal Job object or throws on timeout.
 */
export async function pollJobUntilDone(
  jobId: string,
  tenantId: string,
): Promise<Job> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const job = await getJobStatus(jobId, tenantId);
    if (job.is_terminal) return job;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new AgentToolError(
    408,
    `Job ${jobId} did not complete within ${POLL_TIMEOUT_MS / 1000}s`,
    "The job is still running. Try again later or check the batch annotation page.",
  );
}

/**
 * Poll a cohort until it reaches a terminal state.
 * Uses GET /cohorts/{id}/status (lightweight).
 */
export async function pollCohortUntilReady(
  cohortId: string,
  tenantId: string,
): Promise<CohortStatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await agentFetch<CohortStatusResponse>(
      `/cohorts/${cohortId}/status?tenant_id=${tenantId}`,
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

/**
 * Get cohort summary (gene/consequence/clinical breakdowns + highlights).
 */
export async function getCohortSummaryAgent(
  cohortId: string,
  tenantId: string,
): Promise<CohortSummary> {
  return agentFetch<CohortSummary>(
    `/cohorts/${cohortId}/summary?tenant_id=${tenantId}`,
  );
}

export { AgentToolError };
