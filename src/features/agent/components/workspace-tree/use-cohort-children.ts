"use client";

import { useQuery } from "@tanstack/react-query";
import { listCohorts } from "@features/batch/api";
import { listAnalyticsRuns } from "@features/batch/api";
import type { TreeNode, FolderNode, LeafNode } from "./types";
import {
  buildCohortPath,
  buildSchemaPath,
  buildSamplePath,
  buildRunPath,
  buildVizPath,
  cohortSlug,
} from "./workspace-path";

// ---------------------------------------------------------------------------
// Hook: lazy-fetch children when a cohort folder is expanded
// ---------------------------------------------------------------------------

interface UseCohortChildrenOptions {
  cohortId: string;
  isExpanded: boolean;
  /** Base depth for children (parent depth + 1) */
  baseDepth: number;
}

interface UseCohortChildrenResult {
  derivedNodes: TreeNode[];
  runNodes: TreeNode[];
  isLoading: boolean;
}

export function useCohortChildren({
  cohortId,
  isExpanded,
  baseDepth,
}: UseCohortChildrenOptions): UseCohortChildrenResult {
  // -- Derived sub-cohorts --
  const derivedQuery = useQuery({
    queryKey: ["cohort-derived", cohortId],
    queryFn: () => listCohorts({ parent_id: cohortId, source: "derived" }),
    enabled: isExpanded,
    staleTime: 30_000,
  });

  // -- Analytics runs --
  const runsQuery = useQuery({
    queryKey: ["cohort-analytics-runs", cohortId],
    queryFn: () => listAnalyticsRuns(cohortId, { limit: 50 }),
    enabled: isExpanded,
    staleTime: 30_000,
  });

  const derivedNodes: TreeNode[] = (derivedQuery.data?.cohorts ?? []).map(
    (child): FolderNode => ({
      kind: "cohort",
      id: child.id,
      label: child.label ?? cohortSlug(child),
      path: buildCohortPath(child.id),
      depth: baseDepth,
      children: [
        {
          kind: "schema",
          id: `${child.id}:schema`,
          label: "schema",
          path: buildSchemaPath(child.id),
          depth: baseDepth + 1,
        } satisfies LeafNode,
        {
          kind: "sample",
          id: `${child.id}:sample`,
          label: "sample",
          path: buildSamplePath(child.id),
          depth: baseDepth + 1,
        } satisfies LeafNode,
      ],
    }),
  );

  const runNodes: TreeNode[] = (runsQuery.data?.runs ?? []).map(
    (run): FolderNode | LeafNode => {
      const vizCharts = run.viz_charts ?? [];
      if (vizCharts.length === 0) {
        return {
          kind: "run",
          id: run.id,
          label: run.task_type ?? run.id.slice(0, 8),
          path: buildRunPath(run.id),
          depth: baseDepth,
        } satisfies LeafNode;
      }
      return {
        kind: "run",
        id: run.id,
        label: run.task_type ?? run.id.slice(0, 8),
        path: buildRunPath(run.id),
        depth: baseDepth,
        children: vizCharts.map(
          (chart): LeafNode => ({
            kind: "run-viz",
            id: `${run.id}:viz:${chart.chart_id}`,
            label: chart.title ?? chart.chart_id,
            path: buildVizPath(run.id, chart.chart_id),
            depth: baseDepth + 1,
          }),
        ),
      } satisfies FolderNode;
    },
  );

  return {
    derivedNodes,
    runNodes,
    isLoading: derivedQuery.isLoading || runsQuery.isLoading,
  };
}
