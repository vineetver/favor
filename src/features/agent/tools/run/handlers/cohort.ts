/**
 * Cohort command handlers: rows, groupby, correlation, derive, prioritize, compute
 */

import { cohortFetch } from "../../../lib/api-client";
import {
  catchToResult,
  errorResult,
  okResult,
  TraceCollector,
} from "../run-result";
import type { RunCommand, RunResult } from "../types";

type CohortCommand = Extract<
  RunCommand,
  {
    command:
      | "rows"
      | "groupby"
      | "correlation"
      | "derive"
      | "prioritize"
      | "compute";
  }
>;

function getCohortId(
  cmd: CohortCommand,
  activeCohortId?: string,
): string | null {
  return cmd.cohort_id ?? activeCohortId ?? null;
}

export async function handleRows(
  cmd: Extract<RunCommand, { command: "rows" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({
      message: "No active cohort. Use set_cohort or create_cohort first.",
      code: "no_cohort",
    });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = {};
    if (cmd.sort) body.sort = cmd.sort;
    if (cmd.sort) body.desc = cmd.desc ?? true;
    if (cmd.limit) body.limit = cmd.limit;
    if (cmd.offset) body.offset = cmd.offset;
    if (cmd.select) body.select = cmd.select;
    if (cmd.filters?.length) body.filters = cmd.filters;

    tc.add({
      step: "fetchRows",
      kind: "call",
      message: `POST /cohorts/${cohortId}/rows`,
    });

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/rows`,
      { method: "POST", body, timeout: 60_000 },
    );

    const DEFAULT_ROW_LIMIT = 10;
    const maxRows = Math.min(cmd.limit ?? DEFAULT_ROW_LIMIT, 200);
    const rows = Array.isArray(result.rows)
      ? (result.rows as unknown[]).slice(0, maxRows)
      : result.rows;

    const total = typeof result.total === "number" ? result.total : 0;
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    const isIncomplete = total > maxRows;

    return okResult({
      text_summary:
        (result.text_summary as string) ??
        `Showing ${rowCount} of ${result.total ?? "?"} variants (offset ${cmd.offset ?? 0}).`,
      data: { rows, total: result.total },
      state_delta: {},
      next_reads: [{ path: `cohort/${cohortId}/schema` }],
      tc,
      incomplete: isIncomplete,
      next_cursor: isIncomplete ? (cmd.offset ?? 0) + maxRows : undefined,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleGroupby(
  cmd: Extract<RunCommand, { command: "groupby" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = { group_by: cmd.group_by };
    // Normalize metrics: strip "count" (backend always includes it) and aggregate prefixes
    if (cmd.metrics?.length) {
      const cleaned = cmd.metrics
        .filter((m) => m !== "count")
        .map((m) => (m.includes(":") ? m.split(":").slice(1).join(":") : m))
        .filter(Boolean);
      if (cleaned.length) body.metrics = cleaned;
    }
    if (cmd.limit) body.limit = cmd.limit;
    if (cmd.filters?.length) body.filters = cmd.filters;
    if (cmd.bin_width) body.bin_width = cmd.bin_width;

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/groupby`,
      { method: "POST", body, timeout: 60_000 },
    );

    const maxBuckets = Math.min(cmd.limit ?? 100, 200);
    const buckets = Array.isArray(result.buckets)
      ? (result.buckets as unknown[]).slice(0, maxBuckets)
      : result.buckets;

    const totalGroups =
      typeof result.total_groups === "number" ? result.total_groups : 0;
    const isIncomplete = totalGroups > maxBuckets;

    return okResult({
      text_summary:
        (result.text_summary as string) ??
        `${Array.isArray(buckets) ? buckets.length : 0} groups by ${cmd.group_by}`,
      data: {
        group_by: result.group_by,
        buckets,
        total_groups: result.total_groups,
      },
      state_delta: {},
      tc,
      incomplete: isIncomplete,
      next_cursor: isIncomplete ? maxBuckets : undefined,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleCorrelation(
  cmd: Extract<RunCommand, { command: "correlation" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = { x: cmd.x, y: cmd.y };
    if (cmd.filters?.length) body.filters = cmd.filters;

    tc.add({
      step: "fetchCorrelation",
      kind: "call",
      message: `POST /cohorts/${cohortId}/correlation`,
    });

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/correlation`,
      { method: "POST", body, timeout: 60_000 },
    );

    return okResult({
      text_summary: `Correlation between ${cmd.x} and ${cmd.y}: r = ${result.r}`,
      data: {
        x: result.x,
        y: result.y,
        r: result.r,
        n: result.n,
        x_mean: result.x_mean,
        y_mean: result.y_mean,
        x_stddev: result.x_stddev,
        y_stddev: result.y_stddev,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleDerive(
  cmd: Extract<RunCommand, { command: "derive" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = { filters: cmd.filters };
    if (cmd.label) body.label = cmd.label;

    tc.add({
      step: "derive",
      kind: "call",
      message: `POST /cohorts/${cohortId}/derive`,
    });

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/derive`,
      { method: "POST", body, timeout: 60_000 },
    );

    const derivedId =
      typeof result.cohort_id === "string" ? result.cohort_id : undefined;
    if (!derivedId) {
      return errorResult({
        message: "Derive returned no cohort_id.",
        code: "cohort_processing_failed",
        tc,
      });
    }
    const rowCount = (result.vid_count as number) ?? 0;

    return okResult({
      text_summary: `Derived sub-cohort with ${rowCount} variants`,
      data: {
        derivedCohortId: derivedId,
        parentId: result.parent_id,
        filtersApplied: result.filters_applied,
        variantCount: rowCount,
        summary: result.summary,
      },
      state_delta: {
        derived_cohorts: [
          { id: derivedId, label: cmd.label, row_count: rowCount },
        ],
      },
      next_reads: [{ path: `cohort/${derivedId}/schema` }],
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handlePrioritize(
  cmd: Extract<RunCommand, { command: "prioritize" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = { criteria: cmd.criteria };
    if (cmd.limit) body.limit = cmd.limit;
    if (cmd.filters?.length) body.filters = cmd.filters;

    tc.add({
      step: "prioritize",
      kind: "call",
      message: `POST /cohorts/${cohortId}/prioritize`,
    });

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/prioritize`,
      { method: "POST", body, timeout: 60_000 },
    );

    const rows = Array.isArray(result.rows)
      ? (result.rows as unknown[]).slice(0, Math.min(cmd.limit ?? 10, 200))
      : result.rows;

    return okResult({
      text_summary: `Prioritized ${result.total_ranked ?? 0} variants by ${cmd.criteria.map((c) => c.column).join(", ")}`,
      data: {
        criteria: result.criteria,
        rows,
        total_ranked: result.total_ranked,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleCompute(
  cmd: Extract<RunCommand, { command: "compute" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = getCohortId(cmd, activeCohortId);
  if (!cohortId)
    return errorResult({ message: "No active cohort.", code: "no_cohort" });

  const tc = new TraceCollector();

  try {
    const body: Record<string, unknown> = { weights: cmd.weights };
    if (cmd.normalize != null) body.normalize = cmd.normalize;
    if (cmd.limit) body.limit = cmd.limit;
    if (cmd.filters?.length) body.filters = cmd.filters;

    tc.add({
      step: "compute",
      kind: "call",
      message: `POST /cohorts/${cohortId}/compute`,
    });

    const result = await cohortFetch<Record<string, unknown>>(
      `/cohorts/${encodeURIComponent(cohortId)}/compute`,
      { method: "POST", body, timeout: 60_000 },
    );

    const rows = Array.isArray(result.rows)
      ? (result.rows as unknown[]).slice(0, Math.min(cmd.limit ?? 10, 200))
      : result.rows;

    return okResult({
      text_summary: `Computed weighted score for ${result.total_scored ?? 0} variants`,
      data: { rows, total_scored: result.total_scored },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}
