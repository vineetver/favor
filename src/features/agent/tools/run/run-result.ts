/**
 * Canonical RunResult envelope — shared across all tool handlers.
 *
 * Every Run/Read/Search/State handler returns this shape.
 * Factory functions enforce consistency and eliminate duplication.
 */

import { AgentToolError } from "../../lib/api-client";
import { type ToolErrorCode, classifyApiError } from "./error-classify";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type ToolStatus = "ok" | "error" | "need_clarification" | "partial";

export interface ToolError {
  code: ToolErrorCode | string;
  message: string;
  hint?: string;
  details?: unknown;
  http_status?: number;
  field_path?: string;
  expected?: string;
  got?: string;
}

export interface ToolWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface TraceEntry {
  step: string;
  kind: "decision" | "call" | "cache" | "fallback" | "timing";
  message?: string;
  data?: unknown;
  ms?: number;
}

export interface Candidate {
  type?: string;
  id?: string;
  label: string;
  score?: number;
  reason?: string;
  source?: "resolve" | "search" | "artifact" | "cohort";
}

export interface ResolvedInfo {
  request_id?: string;
  resolved?: unknown;
  cache?: Array<{ key: string; hit: boolean; age_ms?: number }>;
}

export interface SuggestedNext {
  action: string;
  params?: unknown;
  reason?: string;
}

export interface BudgetsRemaining {
  tool_calls?: number;
  api_calls?: number;
  steps?: number;
  context_tokens?: number;
}

// ---------------------------------------------------------------------------
// Trace collector — accumulates trace/warnings during a handler execution
// ---------------------------------------------------------------------------

export class TraceCollector {
  readonly trace: TraceEntry[] = [];
  readonly warnings: ToolWarning[] = [];
  readonly candidates: Candidate[] = [];

  /** Record a trace event */
  add(entry: TraceEntry): void {
    this.trace.push(entry);
  }

  /** Record a timed operation */
  async timed<T>(
    step: string,
    kind: TraceEntry["kind"],
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.trace.push({ step, kind, ms: Date.now() - start });
      return result;
    } catch (err) {
      this.trace.push({
        step,
        kind,
        ms: Date.now() - start,
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Record a warning */
  warn(code: string, message: string, details?: unknown): void {
    this.warnings.push({ code, message, ...(details !== undefined ? { details } : {}) });
  }

  /** Record a candidate for disambiguation */
  addCandidate(candidate: Candidate): void {
    this.candidates.push(candidate);
  }

  /** Merge API-returned meta.warnings into our warnings */
  mergeApiWarnings(apiWarnings: unknown): void {
    if (!Array.isArray(apiWarnings)) return;
    for (const w of apiWarnings) {
      if (w && typeof w === "object" && "message" in w) {
        this.warnings.push({
          code: (w as { code?: string }).code ?? "api_warning",
          message: String((w as { message: string }).message),
        });
      }
    }
  }

  /** Extract meta.requestId + meta.resolved from API response */
  extractResolvedInfo(meta: unknown): ResolvedInfo | undefined {
    if (!meta || typeof meta !== "object") return undefined;
    const m = meta as Record<string, unknown>;
    if (!m.requestId && !m.resolved) return undefined;
    return {
      request_id: m.requestId as string | undefined,
      resolved: m.resolved,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export interface RunResultEnvelope {
  status: ToolStatus;
  text_summary: string;

  data?: Record<string, unknown>;
  artifacts?: Array<{ id: number; type: string; summary: string }>;
  state_delta: {
    active_cohort_id?: string;
    new_artifact_ids?: number[];
    pinned_entities?: Array<{ type: string; id: string; label: string; subtitle?: string }>;
    active_job_ids?: string[];
    derived_cohorts?: Array<{ id: string; label?: string; row_count: number }>;
  };
  next_reads?: Array<{ path: string; reason?: string }>;

  incomplete?: boolean;
  next_cursor?: string | number;

  error?: ToolError;
  warnings?: ToolWarning[];
  trace?: TraceEntry[];
  candidates?: Candidate[];
  resolved_info?: ResolvedInfo;
  suggested_next?: SuggestedNext[];
  budgets_remaining?: BudgetsRemaining;
}

interface OkOpts {
  text_summary: string;
  data: Record<string, unknown>;
  state_delta?: RunResultEnvelope["state_delta"];
  artifacts?: RunResultEnvelope["artifacts"];
  next_reads?: RunResultEnvelope["next_reads"];
  tc?: TraceCollector;
  resolved_info?: ResolvedInfo;
  suggested_next?: SuggestedNext[];
  budgets_remaining?: BudgetsRemaining;
  incomplete?: boolean;
  next_cursor?: string | number;
}

export function okResult(opts: OkOpts): RunResultEnvelope {
  return {
    status: "ok",
    text_summary: opts.text_summary,
    data: opts.data,
    state_delta: opts.state_delta ?? {},
    ...(opts.artifacts?.length ? { artifacts: opts.artifacts } : {}),
    ...(opts.next_reads?.length ? { next_reads: opts.next_reads } : {}),
    ...(opts.incomplete ? { incomplete: true, next_cursor: opts.next_cursor } : {}),
    ...(opts.tc?.trace.length ? { trace: opts.tc.trace } : {}),
    ...(opts.tc?.warnings.length ? { warnings: opts.tc.warnings } : {}),
    ...(opts.tc?.candidates.length ? { candidates: opts.tc.candidates } : {}),
    ...(opts.resolved_info ? { resolved_info: opts.resolved_info } : {}),
    ...(opts.suggested_next?.length ? { suggested_next: opts.suggested_next } : {}),
    ...(opts.budgets_remaining ? { budgets_remaining: opts.budgets_remaining } : {}),
  };
}

export function partialResult(opts: OkOpts): RunResultEnvelope {
  return { ...okResult(opts), status: "partial" };
}

interface ErrorOpts {
  message: string;
  code?: string;
  hint?: string;
  details?: unknown;
  http_status?: number;
  tc?: TraceCollector;
  suggested_next?: SuggestedNext[];
  candidates?: Candidate[];
}

export function errorResult(opts: ErrorOpts): RunResultEnvelope {
  return {
    status: "error",
    text_summary: opts.message,
    data: { error: true, message: opts.message },
    state_delta: {},
    error: {
      code: opts.code ?? "tool_error",
      message: opts.message,
      ...(opts.hint ? { hint: opts.hint } : {}),
      ...(opts.details !== undefined ? { details: opts.details } : {}),
      ...(opts.http_status ? { http_status: opts.http_status } : {}),
    },
    ...(opts.tc?.trace.length ? { trace: opts.tc.trace } : {}),
    ...(opts.tc?.warnings.length || opts.candidates?.length
      ? { warnings: opts.tc?.warnings }
      : {}),
    ...(opts.suggested_next?.length ? { suggested_next: opts.suggested_next } : {}),
    ...(opts.candidates?.length ? { candidates: opts.candidates } : {}),
  };
}

export function needClarificationResult(opts: {
  message: string;
  candidates: Candidate[];
  tc?: TraceCollector;
  suggested_next?: SuggestedNext[];
}): RunResultEnvelope {
  return {
    status: "need_clarification",
    text_summary: opts.message,
    data: { need_clarification: true, message: opts.message },
    state_delta: {},
    candidates: opts.candidates,
    ...(opts.tc?.trace.length ? { trace: opts.tc.trace } : {}),
    ...(opts.tc?.warnings.length ? { warnings: opts.tc.warnings } : {}),
    suggested_next: opts.suggested_next ?? [
      {
        action: "AskUser",
        reason: "Multiple possible matches — let the user pick.",
      },
    ],
  };
}

/** Return a valid "ok" envelope for empty results (not an error). */
export function emptyResult(opts: {
  reason: string;
  tc?: TraceCollector;
  suggested_next?: SuggestedNext[];
}): RunResultEnvelope {
  return okResult({
    text_summary: opts.reason,
    data: { empty: true, reason: opts.reason },
    state_delta: {},
    tc: opts.tc,
    suggested_next: opts.suggested_next,
  });
}

/** Convert an AgentToolError or unknown error into an errorResult */
export function catchToResult(err: unknown, tc?: TraceCollector): RunResultEnvelope {
  if (err instanceof AgentToolError) {
    const classified = classifyApiError(err.status, err.detail);
    return errorResult({
      message: classified.message,
      code: classified.code,
      hint: classified.hint ?? err.recoveryHint,
      http_status: err.status,
      tc,
    });
  }
  const message = err instanceof Error ? err.message : String(err);
  return errorResult({
    message: `Internal error: ${message}`,
    code: "internal_error",
    tc,
  });
}
