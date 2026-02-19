"use client";

import { FlaskConicalIcon, TrashIcon } from "lucide-react";
import type { AgentCohort } from "../lib/cohort-store";
import { formatDate } from "@features/batch/lib/format";

interface CohortListItemProps {
  cohort: AgentCohort;
  onAnalyze?: (cohort: AgentCohort) => void;
  onRemove?: (cohortId: string) => void;
}

export function CohortListItem({
  cohort,
  onAnalyze,
  onRemove,
}: CohortListItemProps) {
  return (
    <div className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-accent">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{cohort.label}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {cohort.variantCount.toLocaleString()} variants
          <span className="mx-1">·</span>
          {formatDate(cohort.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {onAnalyze && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze(cohort);
            }}
            className="rounded p-1 text-muted-foreground hover:text-primary"
            title="Analyze"
          >
            <FlaskConicalIcon className="size-3.5" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(cohort.cohortId);
            }}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
            title="Remove"
          >
            <TrashIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
