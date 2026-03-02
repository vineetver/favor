/**
 * Workspace command handlers: pin, set_cohort, remember, export, create_cohort
 */

import { agentFetch, cohortFetch, pollCohortUntilReady } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchToResult, okResult, TraceCollector } from "../run-result";

export async function handlePin(
  cmd: Extract<RunCommand, { command: "pin" }>,
): Promise<RunResult> {
  return okResult({
    text_summary: `Pinned ${cmd.entities.length} entities`,
    data: { pinned: cmd.entities },
    state_delta: { pinned_entities: cmd.entities },
  });
}

export async function handleSetCohort(
  cmd: Extract<RunCommand, { command: "set_cohort" }>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    tc.add({ step: "fetchSchema", kind: "call", message: `GET /cohorts/${cmd.cohort_id}/schema` });

    const schema = await cohortFetch<{
      row_count?: number;
      data_type?: string;
      text_summary?: string;
    }>(`/cohorts/${encodeURIComponent(cmd.cohort_id)}/schema`, { timeout: 30_000 });

    return okResult({
      text_summary: `Active cohort set to ${cmd.cohort_id} (${schema.row_count ?? 0} rows, type: ${schema.data_type ?? "unknown"})`,
      data: {
        cohortId: cmd.cohort_id,
        rowCount: schema.row_count,
        dataType: schema.data_type,
        summary: schema.text_summary,
      },
      state_delta: { active_cohort_id: cmd.cohort_id },
      next_reads: [{ path: `cohort/${cmd.cohort_id}/schema` }],
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleRemember(
  cmd: Extract<RunCommand, { command: "remember" }>,
  sessionId?: string,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    tc.add({ step: "writeMemory", kind: "call", message: `PUT /agent/memories key=${cmd.key}` });

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

    return okResult({
      text_summary: `Remembered: ${cmd.key}`,
      data: { key: cmd.key, content: cmd.content },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleExport(
  cmd: Extract<RunCommand, { command: "export" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = cmd.cohort_id ?? activeCohortId;
  if (!cohortId) {
    return errorResult({ message: "No active cohort to export.", code: "no_cohort" });
  }

  const tc = new TraceCollector();
  tc.warn("not_implemented", "Export is not yet implemented. The user can export from the cohort UI.");

  return okResult({
    text_summary: `Export not yet available for cohort ${cohortId}. Use the cohort UI to export.`,
    data: { cohortId, exportAvailable: false },
    state_delta: {},
    tc,
  });
}

export async function handleCreateCohort(
  cmd: Extract<RunCommand, { command: "create_cohort" }>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    const idempotencyKey = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cohortLabel = cmd.label ?? `Agent cohort ${new Date().toISOString().slice(0, 10)}`;

    tc.add({ step: "createCohort", kind: "call", message: `POST /cohorts with ${cmd.references.length} references` });

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
      return errorResult({ message: "Cohort creation returned no ID.", code: "create_failed", tc });
    }

    tc.add({ step: "pollCohort", kind: "call", message: `Polling cohort ${cohortId}` });
    const statusResult = await pollCohortUntilReady(cohortId);

    if (statusResult.status === "failed") {
      const progressErrors = statusResult.progress?.errors;
      const failDetail = progressErrors
        ? `${progressErrors} resolution errors`
        : "unknown reason";
      return errorResult({
        message: `Cohort processing failed: ${failDetail}`,
        code: "cohort_processing_failed",
        hint: "Check that the references are valid variant identifiers (rsIDs, VCF-style, etc.).",
        tc,
      });
    }

    const schema = await cohortFetch<{
      text_summary?: string;
      row_count?: number;
    }>(`/cohorts/${encodeURIComponent(cohortId)}/schema`, { timeout: 30_000 });

    const variantCount = schema.row_count ?? statusResult.progress?.found ?? 0;

    return okResult({
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
      state_delta: { active_cohort_id: cohortId },
      next_reads: [{ path: `cohort/${cohortId}/schema` }],
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}
