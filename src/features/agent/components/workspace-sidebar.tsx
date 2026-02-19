"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@infra/utils";
import {
  ChevronRightIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { VariantSubmitPanel } from "./variant-submit-panel";
import { JobListItem } from "./job-list-item";
import { CohortListItem } from "./cohort-list-item";
import { CohortPromptPicker } from "./cohort-prompt-picker";
import {
  type AgentCohort,
  addStoredCohort,
  getStoredCohorts,
  removeStoredCohort,
} from "../lib/cohort-store";
import { getStoredJobs } from "@features/batch/lib/job-storage";
import type { StoredJob } from "@features/batch/types";
import { useSessions } from "../hooks/use-sessions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Collapsible section — text only, no icons
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRightIcon
          className={cn(
            "size-3 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
        <span className="flex-1 text-left">{title}</span>
        {count != null && count > 0 && (
          <span className="size-7 flex items-center justify-center text-[10px] font-medium tabular-nums">
            {count}
          </span>
        )}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceSidebar
// ---------------------------------------------------------------------------

interface WorkspaceSidebarProps {
  onSendMessage: (text: string) => void;
  sessionId: string | null;
  onLoadSession: (id: string) => void;
  onNewChat: () => void;
  className?: string;
}

export function WorkspaceSidebar({
  onSendMessage,
  sessionId,
  onLoadSession,
  onNewChat,
  className,
}: WorkspaceSidebarProps) {
  const [showSubmit, setShowSubmit] = useState(false);

  // ---- Sessions ----
  const { sessions, isLoading: sessionsLoading, deleteSession, refetch } =
    useSessions();

  // Refetch sessions when sessionId changes (new session created)
  useEffect(() => {
    if (sessionId) refetch();
  }, [sessionId, refetch]);

  // ---- Cohorts (localStorage-backed) ----
  const [cohorts, setCohorts] = useState<AgentCohort[]>([]);

  useEffect(() => {
    setCohorts(getStoredCohorts());
  }, []);

  const handleCohortCreated = useCallback((cohort: AgentCohort) => {
    setCohorts(addStoredCohort(cohort));
  }, []);

  const handleCohortRemoved = useCallback((cohortId: string) => {
    setCohorts(removeStoredCohort(cohortId));
  }, []);

  // ---- Cohort prompt picker ----
  const [selectedCohort, setSelectedCohort] = useState<AgentCohort | null>(
    null,
  );

  const handleCohortClick = useCallback((cohort: AgentCohort) => {
    setSelectedCohort(cohort);
  }, []);

  const handleCohortPromptSend = useCallback(
    (message: string) => {
      onSendMessage(message);
      setSelectedCohort(null);
      setShowSubmit(false);
    },
    [onSendMessage],
  );

  const handleAnalyzeCohort = useCallback(
    (cohortId: string) => {
      // Find the cohort by ID and open the prompt picker
      const cohort = cohorts.find((c) => c.cohortId === cohortId);
      if (cohort) {
        setSelectedCohort(cohort);
      }
    },
    [cohorts],
  );

  // ---- Jobs (shared localStorage from batch feature) ----
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    const refresh = () => setJobs(getStoredJobs());
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeJobs = jobs.filter(
    (j) =>
      j.state === "PENDING" ||
      j.state === "RUNNING" ||
      j.state === "CANCEL_REQUESTED",
  );
  const completedJobs = jobs
    .filter((j) => j.state === "COMPLETED" && j.source !== "cohort")
    .slice(0, 10);

  const isEmpty =
    sessions.length === 0 &&
    activeJobs.length === 0 &&
    completedJobs.length === 0 &&
    cohorts.length === 0 &&
    !showSubmit;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
          Workspace
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onNewChat}
            title="New chat"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="py-2">
          {/* Conversations */}
          {sessions.length > 0 && (
            <SidebarSection
              title="Conversations"
              count={sessions.length}
              defaultOpen
            >
              <div className="space-y-0.5 px-2 pb-1">
                {sessions.map((s) => {
                  const isActive = s.session_id === sessionId;
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
                        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <MessageSquareIcon className="size-3.5 shrink-0" />
                      <span className="flex-1 truncate text-[13px]">
                        {s.title || "Untitled"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums">
                        {formatRelativeTime(s.last_activity_at)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.session_id);
                          if (isActive) onNewChat();
                        }}
                        className="shrink-0 rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-accent"
                        title="Delete conversation"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </SidebarSection>
          )}

          {/* Submit Panel */}
          {showSubmit && (
            <div className="px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <VariantSubmitPanel
                onCohortCreated={handleCohortCreated}
                onAnalyzeCohort={handleAnalyzeCohort}
              />
            </div>
          )}

          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <SidebarSection
              title="Active"
              count={activeJobs.length}
              defaultOpen
            >
              <div className="space-y-0.5 px-2 pb-1">
                {activeJobs.map((job) => (
                  <JobListItem key={job.job_id} job={job} />
                ))}
              </div>
            </SidebarSection>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <SidebarSection
              title="Completed"
              count={completedJobs.length}
            >
              <div className="space-y-0.5 px-2 pb-1">
                {completedJobs.map((job) => (
                  <JobListItem
                    key={job.job_id}
                    job={job}
                    onClick={() =>
                      window.open(
                        `/batch-annotation/jobs/${job.job_id}`,
                        "_blank",
                      )
                    }
                  />
                ))}
              </div>
            </SidebarSection>
          )}

          {/* Cohorts */}
          {cohorts.length > 0 && (
            <SidebarSection
              title="Cohorts"
              count={cohorts.length}
              defaultOpen
            >
              <div className="space-y-1.5 px-2 pb-1">
                {cohorts.map((cohort) => (
                  <CohortListItem
                    key={cohort.cohortId}
                    cohort={cohort}
                    onClick={handleCohortClick}
                    onRemove={handleCohortRemoved}
                  />
                ))}
              </div>
            </SidebarSection>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-foreground">
                No conversations yet
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Start a chat to begin exploring
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cohort prompt picker dialog */}
      <CohortPromptPicker
        cohort={selectedCohort}
        open={selectedCohort !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCohort(null);
        }}
        onSend={handleCohortPromptSend}
      />
    </div>
  );
}
