"use client";

import type { CohortListItem } from "@features/batch/types";
import { Skeleton } from "@shared/components/ui/skeleton";
import { useCallback, useState } from "react";
import { TreeBranch, type TreeCallbacks } from "./tree-folder";
import { useWorkspaceTree } from "./use-workspace-tree";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WorkspaceTreeProps {
  /** Send a message in chat */
  onSendMessage: (text: string) => void;
  /** Start a new conversation for a specific cohort (opens CohortPromptPicker) */
  onNewCohortConversation: (cohort: CohortListItem) => void;
  /** Delete a cohort */
  onDeleteCohort: (cohortId: string) => void;
  /** Open the resource viewer for schema/sample */
  onOpenResource: (
    kind: "schema" | "sample",
    cohortId: string,
    cohortLabel: string,
  ) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkspaceTree({
  onSendMessage,
  onNewCohortConversation,
  onDeleteCohort,
  onOpenResource,
}: WorkspaceTreeProps) {
  const { tree, isLoading, cohorts } = useWorkspaceTree();

  // -- expand/collapse state --
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["cohorts"]), // cohorts folder open by default
  );

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // -- context menu callbacks --
  const callbacks: TreeCallbacks = {
    onViewInChat: onSendMessage,
    onNewConversation: (cohortId: string) => {
      const cohort = cohorts.find((c) => c.id === cohortId);
      if (cohort) onNewCohortConversation(cohort);
    },
    onDelete: onDeleteCohort,
    onOpenResource: (kind, cohortId, _label) => {
      const cohort = cohorts.find((c) => c.id === cohortId);
      const label = cohort?.label ?? cohortId.slice(0, 8);
      onOpenResource(kind, cohortId, label);
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-1.5 px-2 py-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[11px] text-muted-foreground">
          No workspace objects yet
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      <TreeBranch
        nodes={tree}
        expanded={expanded}
        onToggle={handleToggle}
        callbacks={callbacks}
      />
    </div>
  );
}
