import { getJobStatus } from "@features/batch/api";
import type { Job } from "@features/batch/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const DEFAULT_TIMEOUT = 30_000; // 30s per tool call

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

export async function agentFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; timeout?: number },
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options?.timeout ?? DEFAULT_TIMEOUT,
  );

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options?.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      const hint = parseErrorHint(res.status, body);
      throw new AgentToolError(res.status, body.slice(0, 500), hint);
    }
    return res.json();
  } catch (err) {
    if (err instanceof AgentToolError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AgentToolError(408, "Request timed out", "Try a simpler query or reduce the limit.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

export interface CohortFromJobResponse {
  cohort_id: string;
  vid_count: number;
  resolution: {
    total: number;
    resolved: number;
    not_found: number;
    ambiguous: number;
    errors: number;
  };
  summary?: {
    text_summary: string;
    cohort_id: string;
    vid_count: number;
    by_gene?: Array<{ geneSymbol: string; count: number; pathogenic: number; functionalImpact: number }>;
    by_consequence?: Array<{ category: string; count: number }>;
    by_clinical_significance?: Array<{ category: string; count: number }>;
    by_frequency?: Array<{ category: string; count: number }>;
    highlights?: Array<{
      rsid?: string;
      vcf: string;
      gene?: string;
      consequence?: string;
      clinicalSignificance?: string;
      caddPhred?: number;
      gnomadAf?: number;
    }>;
  };
}

/**
 * Materialize a cohort from a completed batch job.
 */
export async function cohortFromJob(
  jobId: string,
  tenantId: string,
): Promise<CohortFromJobResponse> {
  return agentFetch<CohortFromJobResponse>(
    `/cohorts/from-job/${jobId}?tenant_id=${tenantId}`,
    { method: "POST", timeout: 30_000 },
  );
}

export { AgentToolError };
