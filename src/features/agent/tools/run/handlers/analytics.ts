/**
 * Analytics command handlers: analytics, analytics.poll, viz
 */

import {
  cohortFetch,
  pollAnalyticsRun,
  fetchAnalyticsChart,
  AgentToolError,
} from "../../../lib/api-client";
import type { AnalyticsChartData } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";

export async function handleAnalytics(
  cmd: Extract<RunCommand, { command: "analytics" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = cmd.cohort_id ?? activeCohortId;
  if (!cohortId) {
    return errorResult("No active cohort. Use set_cohort first.");
  }

  try {
    // Submit analytics run
    const submitResp = await cohortFetch<{
      run_id: string;
      status: string;
      poll_hint_ms?: number;
    }>(`/cohorts/${encodeURIComponent(cohortId)}/analytics/run`, {
      method: "POST",
      body: { task: cmd.params },
      timeout: 30_000,
    });

    const { run_id } = submitResp;

    // Poll until completion
    const result = await pollAnalyticsRun(cohortId, run_id);

    if (result.status === "failed") {
      return {
        text_summary: result.error ?? "Analytics run failed",
        data: {
          error: true,
          message: result.error ?? "Analytics run failed",
          hint: "Check column names and task parameters. Use Read cohort/{id}/schema to verify.",
        },
        state_delta: {},
      };
    }

    // Fetch chart data
    const charts: AnalyticsChartData[] = [];
    for (const chart of result.viz_charts ?? []) {
      try {
        const chartData = await fetchAnalyticsChart(cohortId, run_id, chart.chart_id);
        charts.push(chartData);
      } catch {
        // Skip individual chart fetch failures
      }
    }

    return {
      text_summary: result.summary ?? `${cmd.method} completed`,
      data: {
        taskType: cmd.method,
        runId: run_id,
        summary: result.summary,
        metrics: result.metrics ?? {},
        charts,
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}

export async function handleAnalyticsPoll(
  cmd: Extract<RunCommand, { command: "analytics.poll" }>,
): Promise<RunResult> {
  try {
    const result = await pollAnalyticsRun(cmd.cohort_id, cmd.run_id);

    if (result.status === "failed") {
      return {
        text_summary: result.error ?? "Analytics run failed",
        data: { error: true, message: result.error },
        state_delta: {},
      };
    }

    // Fetch chart data
    const charts: AnalyticsChartData[] = [];
    for (const chart of result.viz_charts ?? []) {
      try {
        const chartData = await fetchAnalyticsChart(cmd.cohort_id, cmd.run_id, chart.chart_id);
        charts.push(chartData);
      } catch {
        // Skip failures
      }
    }

    return {
      text_summary: result.summary ?? `Run ${cmd.run_id}: ${result.status}`,
      data: {
        runId: cmd.run_id,
        status: result.status,
        summary: result.summary,
        metrics: result.metrics ?? {},
        charts,
      },
      state_delta: {},
    };
  } catch (err) {
    return catchError(err);
  }
}

export async function handleViz(
  cmd: Extract<RunCommand, { command: "viz" }>,
): Promise<RunResult> {
  try {
    const chartData = await fetchAnalyticsChart(
      cmd.cohort_id,
      cmd.run_id,
      cmd.chart_id,
    );

    return {
      text_summary: chartData.title ?? `Chart ${cmd.chart_id}`,
      data: chartData as unknown as Record<string, unknown>,
      state_delta: {},
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
