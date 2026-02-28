import { tool } from "ai";
import { z } from "zod";
import {
  cohortFetch,
  pollAnalyticsRun,
  fetchAnalyticsChart,
  AgentToolError,
} from "../lib/api-client";
import type { AnalyticsChartData } from "../lib/api-client";

/**
 * Task spec schemas matching the backend analytics pipeline.
 * Uses a discriminated union on `type` for each analytics task.
 */
const taskSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("regression"),
    target: z.string().describe("Dependent variable column name"),
    features: z.array(z.string()).describe("Independent variable column names"),
    method: z.enum(["linear", "logistic"]).optional().describe("Regression method (default: linear)"),
  }),
  z.object({
    type: z.literal("pca"),
    columns: z.array(z.string()).describe("Numeric columns to include in PCA"),
    n_components: z.number().optional().describe("Number of components (default: 2)"),
  }),
  z.object({
    type: z.literal("clustering"),
    columns: z.array(z.string()).describe("Numeric columns to cluster on"),
    method: z.enum(["kmeans", "hierarchical"]).optional().describe("Clustering method (default: kmeans)"),
    n_clusters: z.number().optional().describe("Number of clusters (default: auto)"),
  }),
  z.object({
    type: z.literal("statistical_test"),
    test: z.enum(["t_test", "mann_whitney", "chi_squared", "fisher_exact", "anova", "kruskal_wallis"])
      .describe("Statistical test to perform"),
    column: z.string().describe("Column to test"),
    group_by: z.string().optional().describe("Grouping column for comparison tests"),
    correction: z.enum(["bonferroni", "fdr_bh", "holm", "none"]).optional()
      .describe("Multiple testing correction (default: fdr_bh)"),
  }),
  z.object({
    type: z.literal("manhattan_plot"),
    p_value_column: z.string().describe("Column containing p-values"),
    chromosome_column: z.string().optional().describe("Chromosome column (default: auto-detect)"),
    position_column: z.string().optional().describe("Position column (default: auto-detect)"),
  }),
  z.object({
    type: z.literal("qq_plot"),
    p_value_column: z.string().describe("Column containing p-values"),
  }),
]);

export const runAnalytics = tool({
  description: `Run an analytics task on a cohort. Supports: regression (linear/logistic), PCA, clustering (kmeans/hierarchical), statistical_test (t_test, mann_whitney, chi_squared, fisher_exact, anova, kruskal_wallis with multiple testing correction), manhattan_plot, and qq_plot. ALWAYS call getCohortSchema first to discover valid column names for the task. Returns metrics and visualization charts.`,
  inputSchema: z.object({
    cohortId: z.string().describe("Cohort ID to run analytics on"),
    task: taskSchema.describe("Analytics task specification"),
  }),
  execute: async ({ cohortId, task }) => {
    try {
      // Submit analytics run
      const submitResp = await cohortFetch<{ run_id: string }>(
        `/cohorts/${encodeURIComponent(cohortId)}/analytics/run`,
        { method: "POST", body: { task }, timeout: 30_000 },
      );

      const { run_id } = submitResp;

      // Poll until completion
      const result = await pollAnalyticsRun(cohortId, run_id);

      if (result.status === "failed") {
        return {
          error: true,
          message: result.error ?? "Analytics run failed",
          hint: "Check column names and task parameters. Use getCohortSchema to verify valid columns.",
        };
      }

      // Fetch chart data for each viz_chart
      const charts: AnalyticsChartData[] = [];
      if (result.viz_charts?.length) {
        for (const chart of result.viz_charts) {
          try {
            const chartData = await fetchAnalyticsChart(cohortId, run_id, chart.chart_id);
            charts.push(chartData);
          } catch {
            // Skip individual chart fetch failures
          }
        }
      }

      return {
        taskType: task.type,
        runId: run_id,
        metrics: result.metrics ?? {},
        charts,
      };
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
