"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@infra/utils";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { VariantSubmitPanel } from "./variant-submit-panel";
import { JobListItem } from "./job-list-item";
import { CohortListItem } from "./cohort-list-item";
import {
  type AgentCohort,
  addStoredCohort,
  getStoredCohorts,
  removeStoredCohort,
} from "../lib/cohort-store";
import { getStoredJobs } from "@features/batch/lib/job-storage";
import type { StoredJob } from "@features/batch/types";

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
  className?: string;
}

export function WorkspaceSidebar({
  onSendMessage,
  className,
}: WorkspaceSidebarProps) {
  const [showSubmit, setShowSubmit] = useState(false);

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

  const handleAnalyzeCohort = useCallback(
    (cohortId: string) => {
      onSendMessage(
        `Analyze cohort ${cohortId}. Tell me about the variant composition, gene distribution, clinical significance, and any notable findings.`,
      );
      setShowSubmit(false);
    },
    [onSendMessage],
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
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={() => setShowSubmit(!showSubmit)}
          title="Submit variants"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="py-2">
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
              <div className="space-y-0.5 px-2 pb-1">
                {cohorts.map((cohort) => (
                  <CohortListItem
                    key={cohort.cohortId}
                    cohort={cohort}
                    onAnalyze={(c) => handleAnalyzeCohort(c.cohortId)}
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
                No cohorts yet
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Submit variants to create a cohort
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 rounded-lg"
                onClick={() => setShowSubmit(true)}
              >
                Submit Variants
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
