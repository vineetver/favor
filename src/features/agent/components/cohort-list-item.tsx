"use client";

import {
  DatabaseIcon,
  ClipboardPasteIcon,
  UploadIcon,
  BotIcon,
  FlaskConicalIcon,
  TrashIcon,
} from "lucide-react";
import type { AgentCohort } from "../lib/cohort-store";
import { formatDate } from "@features/batch/lib/format";

const SOURCE_ICONS: Record<AgentCohort["source"], React.ReactNode> = {
  paste: <ClipboardPasteIcon className="size-3" />,
  upload: <UploadIcon className="size-3" />,
  agent: <BotIcon className="size-3" />,
};

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
    <div className="group flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left text-xs transition-colors hover:bg-accent">
      <div className="mt-0.5 rounded bg-primary/10 p-1.5 text-primary">
        <DatabaseIcon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{cohort.label}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {SOURCE_ICONS[cohort.source]}
          <span>{cohort.variantCount.toLocaleString()} variants</span>
          <span>·</span>
          <span>{formatDate(cohort.createdAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onAnalyze && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze(cohort);
            }}
            className="rounded p-1 text-primary hover:bg-primary/10"
            title="Analyze in chat"
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
