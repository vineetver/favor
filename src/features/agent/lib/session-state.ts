/**
 * Session state management — fetch, update, and apply deltas.
 */

import { agentFetch, AgentToolError } from "./api-client";
import type { EntityRef, RunResult } from "../tools/run/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionState {
  mode: "cohort" | "graph" | "mixed";
  active_cohort_id: string | null;
  cohort_status: string | null;
  cohort_row_count: number | null;
  schema_digest: {
    columns: Array<{ name: string; kind: string; role: string }>;
    capabilities: Record<string, unknown> | null;
    available_methods: string[];
  } | null;
  pinned_entities: Array<{
    type: string;
    id?: string;
    label?: string;
    query?: string;
  }>;
  resolved_entities: Record<string, EntityRef>;
  graph_portal: string;
  recent_artifact_ids: number[];
  active_job_ids: string[];
  derived_cohorts: Array<{
    id: string;
    label?: string;
    parent_id?: string;
    row_count: number;
  }>;
  user_goal: string | null;
  conversation_summary: string | null;
}

export interface SessionStateResponse {
  version: number;
  state: SessionState;
}

const DEFAULT_STATE: SessionState = {
  mode: "mixed",
  active_cohort_id: null,
  cohort_status: null,
  cohort_row_count: null,
  schema_digest: null,
  pinned_entities: [],
  resolved_entities: {},
  graph_portal: "biokg",
  recent_artifact_ids: [],
  active_job_ids: [],
  derived_cohorts: [],
  user_goal: null,
  conversation_summary: null,
};

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function fetchSessionState(
  sessionId: string,
): Promise<SessionStateResponse> {
  try {
    return await agentFetch<SessionStateResponse>(
      `/agent/sessions/${sessionId}/state`,
    );
  } catch (err) {
    if (err instanceof AgentToolError && err.status === 404) {
      // No state yet — return defaults
      return { version: 0, state: { ...DEFAULT_STATE } };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Update (full replace with optimistic concurrency)
// ---------------------------------------------------------------------------

export async function updateSessionState(
  sessionId: string,
  version: number,
  state: SessionState,
): Promise<{ version: number }> {
  return agentFetch<{ version: number }>(
    `/agent/sessions/${sessionId}/state`,
    {
      method: "PUT",
      body: { version, state },
    },
  );
}

// ---------------------------------------------------------------------------
// Patch (partial merge)
// ---------------------------------------------------------------------------

export async function patchSessionState(
  sessionId: string,
  patch: Partial<SessionState>,
  expectedVersion: number,
): Promise<{ version: number }> {
  return agentFetch<{ version: number }>(
    `/agent/sessions/${sessionId}/state`,
    {
      method: "PATCH",
      body: { delta: patch, expected_version: expectedVersion },
    },
  );
}

// ---------------------------------------------------------------------------
// Apply state delta from a Run result
// ---------------------------------------------------------------------------

export function applyStateDelta(
  state: SessionState,
  delta: RunResult["state_delta"],
): SessionState {
  const next = { ...state };

  if (delta.active_cohort_id) {
    // If cohort changed, invalidate stale schema
    if (delta.active_cohort_id !== state.active_cohort_id) {
      next.schema_digest = null;
    }
    next.active_cohort_id = delta.active_cohort_id;
    next.mode = (next.pinned_entities?.length ?? 0) > 0 ? "mixed" : "cohort";
  }

  if (delta.pinned_entities?.length) {
    const pinned = next.pinned_entities ?? [];
    const existing = new Set(
      pinned.map((e) => `${e.type}:${e.id}`),
    );
    const updated = [...pinned];
    for (const entity of delta.pinned_entities) {
      const key = `${entity.type}:${entity.id}`;
      if (!existing.has(key)) {
        updated.push(entity);
        existing.add(key);
      }
      // Also cache in resolved_entities
      next.resolved_entities = {
        ...next.resolved_entities,
        [key]: entity,
        [entity.label]: entity,
      };
    }
    next.pinned_entities = updated;
    if (!next.active_cohort_id) {
      next.mode = "graph";
    } else {
      next.mode = "mixed";
    }
  }

  if (delta.new_artifact_ids?.length) {
    next.recent_artifact_ids = [
      ...delta.new_artifact_ids,
      ...(next.recent_artifact_ids ?? []),
    ].slice(0, 10);
  }

  if (delta.active_job_ids?.length) {
    next.active_job_ids = [
      ...delta.active_job_ids,
      ...(next.active_job_ids ?? []),
    ];
  }

  if (delta.derived_cohorts?.length) {
    next.derived_cohorts = [
      ...delta.derived_cohorts,
      ...(next.derived_cohorts ?? []),
    ];
  }

  return next;
}

// ---------------------------------------------------------------------------
// Compact state snapshot for system prompt injection
// ---------------------------------------------------------------------------

export function stateToPromptSnippet(state: SessionState): string {
  const lines: string[] = ["## WORKSPACE STATE"];

  lines.push(`Mode: ${state.mode}`);

  // --- Cohort state + tool availability hints ---
  if (state.active_cohort_id) {
    lines.push(
      `Active cohort: ${state.active_cohort_id} (${state.cohort_status ?? "unknown"}, ${state.cohort_row_count ?? "?"} rows)`,
    );

    if (!state.schema_digest) {
      lines.push("⚠ Schema not loaded for this cohort. Call State to refresh before running cohort commands.");
    } else if (state.schema_digest) {
      const numericCols = (state.schema_digest.columns ?? [])
        .filter((c) => c.kind === "numeric")
        .map((c) => c.name);
      const categoricalCols = (state.schema_digest.columns ?? [])
        .filter((c) => c.kind === "categorical")
        .map((c) => c.name);
      if (numericCols.length > 0) lines.push(`Numeric columns: ${numericCols.join(", ")}`);
      if (categoricalCols.length > 0) lines.push(`Categorical columns: ${categoricalCols.join(", ")}`);
      if (state.schema_digest.available_methods?.length > 0) {
        lines.push(`Available analytics: ${state.schema_digest.available_methods.join(", ")}`);
      }
      // Row count hint for analytics feasibility
      if (state.cohort_row_count != null && state.cohort_row_count < 20) {
        lines.push(`⚠ Low row count (${state.cohort_row_count}) — analytics may be unreliable. Prefer rows/groupby.`);
      }
    }
  } else {
    lines.push("Active cohort: none — cohort commands (rows, groupby, analytics) are UNAVAILABLE. Use graph commands or ask user to upload/select a cohort.");
  }

  // --- Pinned entities — usable as seeds without re-resolving ---
  if (state.pinned_entities?.length > 0) {
    const pinList = state.pinned_entities
      .slice(0, 10)
      .map((e) => `${e.type}:${e.label ?? e.id ?? e.query}`)
      .join(", ");
    lines.push(`Pinned entities (use as seeds with {type,id}): ${pinList}`);
  }

  if (state.active_job_ids?.length > 0) {
    lines.push(`Active jobs: ${state.active_job_ids.join(", ")}`);
  }

  if (state.derived_cohorts?.length > 0) {
    const derivedList = state.derived_cohorts
      .slice(0, 5)
      .map((d) => `${d.label ?? d.id} (${d.row_count} rows)`)
      .join(", ");
    lines.push(`Derived cohorts: ${derivedList}`);
  }

  lines.push(`Graph portal: ${state.graph_portal}`);
  lines.push("Graph commands (explore, traverse, query) are always available.");

  if (state.user_goal) {
    lines.push(`User goal: ${state.user_goal}`);
  }

  if (state.conversation_summary) {
    lines.push(`\nConversation so far: ${state.conversation_summary}`);
  }

  return lines.join("\n");
}
