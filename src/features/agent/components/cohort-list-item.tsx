"use client";

import { FlaskConicalIcon, MessageSquarePlusIcon, TrashIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { AgentCohort } from "../lib/cohort-store";
import { formatDate } from "@features/batch/lib/format";

interface CohortListItemProps {
  cohort: AgentCohort;
  onClick?: (cohort: AgentCohort) => void;
  onRemove?: (cohortId: string) => void;
}

export function CohortListItem({
  cohort,
  onClick,
  onRemove,
}: CohortListItemProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onClick?.(cohort)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(cohort);
          }
        }}
        className="group cursor-pointer flex w-full items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-left transition-all hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow-sm"
      >
        <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
          <FlaskConicalIcon className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">
            {cohort.label}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {cohort.variantCount.toLocaleString()} variants
            <span className="mx-1">&middot;</span>
            {formatDate(cohort.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex rounded-md p-1 text-muted-foreground/40 transition-colors group-hover:text-primary">
                <MessageSquarePlusIcon className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Explore with AI
            </TooltipContent>
          </Tooltip>
          {onRemove && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(cohort.cohortId);
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Remove cohort
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
