/**
 * Analytics command handlers: analytics, analytics.poll, viz
 */

import {
  cohortFetch,
  pollAnalyticsRun,
  fetchAnalyticsChart,
} from "../../../lib/api-client";
import type { AnalyticsChartData } from "../../../lib/api-client";
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchToResult, okResult, TraceCollector } from "../run-result";

export async function handleAnalytics(
  cmd: Extract<RunCommand, { command: "analytics" }>,
  activeCohortId?: string,
): Promise<RunResult> {
  const cohortId = cmd.cohort_id ?? activeCohortId;
  if (!cohortId) {
    return errorResult({ message: "No active cohort. Use set_cohort first.", code: "no_cohort" });
  }

  const tc = new TraceCollector();

  try {
    tc.add({ step: "submitAnalytics", kind: "call", message: `POST /cohorts/${cohortId}/analytics/run` });

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

    tc.add({ step: "pollAnalytics", kind: "call", message: `Polling run ${run_id}` });
    const result = await pollAnalyticsRun(cohortId, run_id);

    if (result.status === "failed") {
      return errorResult({
        message: result.error ?? "Analytics run failed",
        code: "analytics_failed",
        hint: "Check column names and task parameters. Use Read cohort/{id}/schema to verify.",
        tc,
      });
    }

    // Fetch chart data
    const charts: AnalyticsChartData[] = [];
    for (const chart of result.viz_charts ?? []) {
      try {
        const chartData = await fetchAnalyticsChart(cohortId, run_id, chart.chart_id);
        charts.push(chartData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tc.warn("chart_fetch_failed", `Chart ${chart.chart_id}: ${msg}`);
      }
    }

    return okResult({
      text_summary: result.summary ?? `${cmd.method} completed`,
      data: {
        taskType: cmd.method,
        runId: run_id,
        summary: result.summary,
        metrics: result.metrics ?? {},
        charts,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

export async function handleAnalyticsPoll(
  cmd: Extract<RunCommand, { command: "analytics.poll" }>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    tc.add({ step: "pollAnalytics", kind: "call", message: `Polling run ${cmd.run_id}` });
    const result = await pollAnalyticsRun(cmd.cohort_id, cmd.run_id);

    if (result.status === "failed") {
      return errorResult({
        message: result.error ?? "Analytics run failed",
        code: "analytics_failed",
        tc,
      });
    }

    // Fetch chart data
    const charts: AnalyticsChartData[] = [];
    for (const chart of result.viz_charts ?? []) {
      try {
        const chartData = await fetchAnalyticsChart(cmd.cohort_id, cmd.run_id, chart.chart_id);
        charts.push(chartData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tc.warn("chart_fetch_failed", `Chart ${chart.chart_id}: ${msg}`);
      }
    }

    return okResult({
      text_summary: result.summary ?? `Run ${cmd.run_id}: ${result.status}`,
      data: {
        runId: cmd.run_id,
        status: result.status,
        summary: result.summary,
        metrics: result.metrics ?? {},
        charts,
      },
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
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

    return okResult({
      text_summary: chartData.title ?? `Chart ${cmd.chart_id}`,
      data: chartData as unknown as Record<string, unknown>,
      state_delta: {},
    });
  } catch (err) {
    return catchToResult(err);
  }
}
