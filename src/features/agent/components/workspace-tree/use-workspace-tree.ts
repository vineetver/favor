"use client";

import { useCohorts } from "@features/batch/hooks/use-cohorts";
import type { CohortListItem } from "@features/batch/types";
import { useMemo } from "react";
import type { FolderNode, LeafNode, TreeNode } from "./types";
import {
  buildCohortPath,
  buildDerivedFolderPath,
  buildRunsFolderPath,
  buildSamplePath,
  buildSchemaPath,
  cohortSlug,
} from "./workspace-path";

// ---------------------------------------------------------------------------
// Build the static tree from cached cohort list
// ---------------------------------------------------------------------------

function cohortChildren(cohort: CohortListItem): TreeNode[] {
  const id = cohort.id;
  const depth = 2;

  const schema: LeafNode = {
    kind: "schema",
    id: `${id}:schema`,
    label: "schema",
    path: buildSchemaPath(id),
    depth,
  };

  const sample: LeafNode = {
    kind: "sample",
    id: `${id}:sample`,
    label: "sample",
    path: buildSamplePath(id),
    depth,
  };

  const derived: FolderNode = {
    kind: "derived-folder",
    id: `${id}:derived`,
    label: "derived",
    path: buildDerivedFolderPath(id),
    depth,
    children: "lazy",
  };

  const runs: FolderNode = {
    kind: "runs-folder",
    id: `${id}:runs`,
    label: "runs",
    path: buildRunsFolderPath(id),
    depth,
    children: "lazy",
  };

  return [schema, sample, derived, runs];
}

function buildCohortNode(cohort: CohortListItem): FolderNode {
  return {
    kind: "cohort",
    id: cohort.id,
    label: cohort.label ?? cohortSlug(cohort),
    path: buildCohortPath(cohort.id),
    depth: 1,
    children: cohortChildren(cohort),
    childCount: cohort.variant_count ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseWorkspaceTreeResult {
  tree: TreeNode[];
  isLoading: boolean;
  cohorts: CohortListItem[];
  refetchCohorts: () => void;
}

export function useWorkspaceTree(): UseWorkspaceTreeResult {
  const { cohorts, isLoading, refetch } = useCohorts();

  const tree = useMemo<TreeNode[]>(() => {
    const nodes: TreeNode[] = [];

    // -- cohorts folder --
    if (cohorts.length > 0) {
      const cohortsFolderNode: FolderNode = {
        kind: "cohorts-folder",
        id: "cohorts",
        label: "cohorts",
        path: "cohorts",
        depth: 0,
        children: cohorts.map(buildCohortNode),
        childCount: cohorts.length,
      };
      nodes.push(cohortsFolderNode);
    }

    // -- graph folder --
    const graphFolder: FolderNode = {
      kind: "graph-folder",
      id: "graph",
      label: "graph",
      path: "graph",
      depth: 0,
      children: [
        {
          kind: "graph-schema",
          id: "graph:schema",
          label: "schema",
          path: "graph/schema",
          depth: 1,
        } satisfies LeafNode,
      ],
    };
    nodes.push(graphFolder);

    return nodes;
  }, [cohorts]);

  return { tree, isLoading, cohorts, refetchCohorts: refetch };
}
