/**
 * Analytics command handlers: analytics, analytics.poll, viz
 */

import {
  cohortFetch,
  pollAnalyticsRun,
  fetchAnalyticsChart,
} from "../../../lib/api-client";
import type { AnalyticsChartData } from "../../../lib/api-client";
// Note: handleViz uses cohortFetch directly to support max_points param
import type { RunCommand, RunResult } from "../types";
import { errorResult, catchToResult, okResult, TraceCollector } from "../run-result";

/** Regression types that can auto-fallback to elastic_net on fit failure */
const FALLBACK_TO_ELASTIC_NET = new Set(["linear_regression", "logistic_regression"]);

/** Submit an analytics task, poll for completion, and fetch charts */
async function submitAndPoll(
  cohortId: string,
  task: Record<string, unknown>,
  method: string,
  tc: TraceCollector,
): Promise<RunResult> {
  tc.add({ step: "submitAnalytics", kind: "call", message: `POST /cohorts/${cohortId}/analytics/run` });

  const submitResp = await cohortFetch<{
    run_id: string;
    status: string;
    poll_hint_ms?: number;
  }>(`/cohorts/${encodeURIComponent(cohortId)}/analytics/run`, {
    method: "POST",
    body: { task },
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

  // Fetch chart data in parallel
  const chartSpecs = result.viz_charts ?? [];
  const chartResults = await Promise.all(
    chartSpecs.map(async (chart) => {
      try {
        return await fetchAnalyticsChart(cohortId, run_id, chart.chart_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        tc.warn("chart_fetch_failed", `Chart ${chart.chart_id}: ${msg}`);
        return null;
      }
    }),
  );
  const charts = chartResults.filter((c): c is AnalyticsChartData => c !== null);

  return okResult({
    text_summary: result.summary ?? `${method} completed`,
    data: {
      taskType: method,
      runId: run_id,
      summary: result.summary,
      metrics: result.metrics ?? {},
      charts,
    },
    state_delta: {},
    tc,
  });
}

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
    const result = await submitAndPoll(cohortId, cmd.params as Record<string, unknown>, cmd.method, tc);

    // Auto-fallback: if linear/logistic regression fails (singular matrix from sparse data),
    // retry as elastic_net with default regularization — regularization handles collinearity.
    if (
      result.status === "error" &&
      result.error?.code === "analytics_failed" &&
      FALLBACK_TO_ELASTIC_NET.has(cmd.method)
    ) {
      tc.add({ step: "fallback", kind: "fallback", message: `${cmd.method} failed — retrying as elastic_net` });
      const fallbackTask = {
        ...(cmd.params as Record<string, unknown>),
        type: "elastic_net",
        l1_ratio: 0.5,
        lambda: 0.01,
      };
      return submitAndPoll(cohortId, fallbackTask, "elastic_net", tc);
    }

    return result;
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

    // Fetch chart data in parallel
    const chartSpecs = result.viz_charts ?? [];
    const chartResults = await Promise.all(
      chartSpecs.map(async (chart) => {
        try {
          return await fetchAnalyticsChart(cmd.cohort_id, cmd.run_id, chart.chart_id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          tc.warn("chart_fetch_failed", `Chart ${chart.chart_id}: ${msg}`);
          return null;
        }
      }),
    );
    const charts = chartResults.filter((c): c is AnalyticsChartData => c !== null);

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
  const tc = new TraceCollector();

  try {
    const maxPointsParam = cmd.max_points ? `&max_points=${cmd.max_points}` : "";
    tc.add({ step: "fetchViz", kind: "call", message: `GET viz chart ${cmd.chart_id}${maxPointsParam ? ` (max_points=${cmd.max_points})` : ""}` });

    const vizUrl = `/cohorts/${encodeURIComponent(cmd.cohort_id)}/analytics/runs/${encodeURIComponent(cmd.run_id)}/viz?chart_id=${encodeURIComponent(cmd.chart_id)}${maxPointsParam}`;
    const chartData = await cohortFetch<AnalyticsChartData>(vizUrl);

    return okResult({
      text_summary: chartData.title ?? `Chart ${cmd.chart_id}`,
      data: chartData as unknown as Record<string, unknown>,
      state_delta: {},
      tc,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}
