/**
 * Workspace command handlers: pin, set_cohort, remember, export, create_cohort
 */

import { agentFetch, cohortFetch, pollCohortUntilReady, AgentToolError } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";

export async function handlePin(
  cmd: Extract<RunCommand, { command: "pin" }>,
): Promise<RunResult> {
  return {
    text_summary: `Pinned ${cmd.entities.length} entities`,
    data: { pinned: cmd.entities },
    state_delta: {
      pinned_entities: cmd.entities,
    },
  };
}

export async function handleSetCohort(
  cmd: Extract<RunCommand, { command: "set_cohort" }>,
): Promise<RunResult> {
  // Verify the cohort exists by fetching its schema
  try {
    const schema = await cohortFetch<{
      row_count?: number;
      data_type?: string;
      text_summary?: string;
    }>(`/cohorts/${encodeURIComponent(cmd.cohort_id)}/schema`, { timeout: 30_000 });

    return {
      text_summary: `Active cohort set to ${cmd.cohort_id} (${schema.row_count ?? 0} rows, type: ${schema.data_type ?? "unknown"})`,
      data: {
        cohortId: cmd.cohort_id,
        rowCount: schema.row_count,
        dataType: schema.data_type,
        summary: schema.text_summary,
      },
      state_delta: {
        active_cohort_id: cmd.cohort_id,
      },
      next_reads: [`cohort/${cmd.cohort_id}/schema`],
    };
  } catch (err) {
    return catchError(err);
  }
}

export async function handleRemember(
  cmd: Extract<RunCommand, { command: "remember" }>,
  sessionId?: string,
): Promise<RunResult> {
  try {
    await agentFetch("/agent/memories", {
      method: "PUT",
      body: {
        scope: "user",
        memory_type: "fact",
        memory_key: cmd.key,
        content: cmd.content,
        value: cmd.value ?? null,
        source_session_id: sessionId ?? null,
      },
    });

    return {
      text_summary: `Remembered: ${cmd.key}`,
      data: { key: cmd.key, content: cmd.content },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}

export async function handleExport(
  cmd: Extract<RunCommand, { command: "export" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = cmd.cohort_id ?? activeCohortId;
  if (!cohortId) {
    return errorResult("No active cohort to export.");
  }

  // For now, return the cohort ID and suggest the user download via UI
  return {
    text_summary: `Cohort ${cohortId} ready for export`,
    data: { cohortId, exportReady: true },
    state_delta: {},
  };
}

export async function handleCreateCohort(
  cmd: Extract<RunCommand, { command: "create_cohort" }>,
): Promise<RunResult> {
  try {
    const idempotencyKey = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cohortLabel = cmd.label ?? `Agent cohort ${new Date().toISOString().slice(0, 10)}`;

    // Step 1: Create cohort
    const submitResult = await cohortFetch<{
      id: string;
      status: string;
    }>("/cohorts", {
      method: "POST",
      body: {
        references: cmd.references,
        label: cohortLabel,
        idempotency_key: idempotencyKey,
      },
      timeout: 60_000,
    });

    const cohortId = submitResult.id;
    if (!cohortId) {
      return errorResult("Cohort creation returned no ID.");
    }

    // Step 2: Poll until ready
    const statusResult = await pollCohortUntilReady(cohortId);

    if (statusResult.status === "failed") {
      return errorResult(`Cohort processing failed: ${statusResult.status}`);
    }

    // Step 3: Get schema for row count
    const schema = await cohortFetch<{
      text_summary?: string;
      row_count?: number;
    }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, { timeout: 30_000 });

    const variantCount = schema.row_count ?? statusResult.progress?.found ?? 0;

    return {
      text_summary: `Created cohort with ${variantCount} variants`,
      data: {
        cohortId,
        variantCount,
        resolution: {
          total: statusResult.progress?.rows_resolved ?? cmd.references.length,
          resolved: statusResult.progress?.found ?? variantCount,
          notFound: statusResult.progress?.not_found ?? 0,
        },
        summary: schema.text_summary ?? `Cohort created with ${variantCount} variants.`,
      },
      state_delta: {
        active_cohort_id: cohortId,
      },
      next_reads: [`cohort/${cohortId}/schema`],
    };
  } catch (err) {
    return catchError(err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorResult(message: string): RunResult {
  return {
    text_summary: message,
    data: { error: true, message },
    state_delta: {},
  };
}

function catchError(err: unknown): RunResult {
  if (err instanceof AgentToolError) {
    return {
      text_summary: err.detail,
      data: err.toToolResult(),
      state_delta: {},
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    text_summary: `Internal error: ${message}`,
    data: { error: true, message },
    state_delta: {},
  };
}
