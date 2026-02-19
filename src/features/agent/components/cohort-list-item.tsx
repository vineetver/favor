"use client";

import { useEffect, useState } from "react";
import {
  ChevronRightIcon,
  FlaskConicalIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
  TrashIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import type { AgentCohort } from "../lib/cohort-store";
import { formatDate } from "@features/batch/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionSummary {
  session_id: string;
  title: string | null;
  last_activity_at: string;
}

interface CohortListItemProps {
  cohort: AgentCohort;
  /** Sessions from the API that are linked to this cohort */
  linkedSessions: SessionSummary[];
  /** Currently active session ID in the chat view */
  activeSessionId: string | null;
  /** Open the prompt picker to start a new conversation for this cohort */
  onNewConversation: (cohort: AgentCohort) => void;
  /** Load an existing session into the chat view */
  onLoadSession: (sessionId: string) => void;
  /** Delete a session */
  onDeleteSession: (sessionId: string) => void;
  /** Remove the cohort from the sidebar */
  onRemove?: (cohortId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CohortListItem({
  cohort,
  linkedSessions,
  activeSessionId,
  onNewConversation,
  onLoadSession,
  onDeleteSession,
  onRemove,
}: CohortListItemProps) {
  const hasActive = linkedSessions.some(
    (s) => s.session_id === activeSessionId,
  );
  const [expanded, setExpanded] = useState(hasActive);
  const hasSessions = linkedSessions.length > 0;

  // Auto-expand when a linked session becomes active
  useEffect(() => {
    if (hasActive) setExpanded(true);
  }, [hasActive]);

  const handleCardClick = () => {
    if (hasSessions) {
      setExpanded(!expanded);
    } else {
      onNewConversation(cohort);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "rounded-xl border transition-all overflow-hidden",
          hasActive
            ? "border-primary/30 bg-primary/[0.02]"
            : "border-border/60 hover:border-primary/25",
        )}
      >
        {/* Card header */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCardClick();
            }
          }}
          className="group flex w-full items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-primary/[0.03]"
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
              {hasSessions ? (
                <>
                  <span className="mx-1">&middot;</span>
                  {linkedSessions.length}{" "}
                  {linkedSessions.length === 1 ? "chat" : "chats"}
                </>
              ) : (
                <>
                  <span className="mx-1">&middot;</span>
                  {formatDate(cohort.createdAt)}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center">
            {hasSessions && (
              <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-foreground hover:bg-accent">
                <ChevronRightIcon
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    expanded && "rotate-90",
                  )}
                />
              </span>
            )}

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
                      onRemove(cohort.cohortId);
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

        {/* Nested sessions (expanded) */}
        {expanded && hasSessions && (
          <div className="border-t border-border/40 py-1 px-1.5">
            {linkedSessions.map((s) => {
              const isActive = s.session_id === activeSessionId;
              return (
                <div
                  key={s.session_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onLoadSession(s.session_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onLoadSession(s.session_id);
                    }
                  }}
                  className={cn(
                    "group/session flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <MessageSquareIcon className="size-3 shrink-0" />
                  <span className="flex-1 truncate">
                    {s.title || "Untitled"}
                  </span>
                  <span className="shrink-0 text-[9px] text-muted-foreground/50 tabular-nums">
                    {formatRelativeTime(s.last_activity_at)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.session_id);
                    }}
                    className="shrink-0 rounded-md p-0.5 opacity-0 transition-opacity group-hover/session:opacity-100 text-muted-foreground hover:text-destructive hover:bg-accent"
                  >
                    <Trash2Icon className="size-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
