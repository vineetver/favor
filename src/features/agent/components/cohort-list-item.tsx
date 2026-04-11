"use client";

import { formatDate } from "@features/batch/lib/format";
import type { CohortListItem } from "@features/batch/types";
import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { FlaskConicalIcon, PlusIcon, TrashIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CohortListItemProps {
  cohort: CohortListItem;
  /** Open the prompt picker to start a new conversation for this cohort */
  onNewConversation: (cohort: CohortListItem) => void;
  /** Remove the cohort */
  onRemove?: (cohortId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CohortListItem({
  cohort,
  onNewConversation,
  onRemove,
}: CohortListItemProps) {
  const isProcessing =
    cohort.status !== "ready" &&
    cohort.status !== "failed" &&
    cohort.status !== "cancelled";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "rounded-xl border transition-all overflow-hidden",
          "border-border/60 hover:border-primary/25",
        )}
      >
        {/* Card header */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNewConversation(cohort)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onNewConversation(cohort);
            }
          }}
          className="group flex w-full items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-primary/[0.03]"
        >
          <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
            <FlaskConicalIcon className="size-3.5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {cohort.label ?? "Untitled cohort"}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {isProcessing ? (
                <span className="text-amber-600">{cohort.status}</span>
              ) : cohort.variant_count != null ? (
                `${cohort.variant_count.toLocaleString()} variants`
              ) : (
                "—"
              )}
              <span className="mx-1">&middot;</span>
              {formatDate(cohort.created_at)}
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewConversation(cohort);
                  }}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-primary hover:bg-primary/10"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                New conversation
              </TooltipContent>
            </Tooltip>

            {onRemove && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(cohort.id);
                    }}
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
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
      </div>
    </TooltipProvider>
  );
}
