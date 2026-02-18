"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@infra/utils";
import {
  ChevronRightIcon,
  DnaIcon,
  PlusIcon,
  BriefcaseIcon,
  DatabaseIcon,
} from "lucide-react";

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
// Collapsible section
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRightIcon
          className={cn(
            "size-3 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count != null && count > 0 && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-150">
          {children}
        </div>
      )}
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
    .filter((j) => j.state === "COMPLETED")
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
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <DnaIcon className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-foreground leading-none tracking-tight">
              Workspace
            </h2>
            <p className="mt-1 text-[10px] text-muted-foreground leading-none">
              Cohorts &amp; jobs
            </p>
          </div>
        </div>
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

      {/* Divider */}
      <div className="mx-4 h-px bg-border" />

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-w-0">
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
              title="Active Jobs"
              icon={<BriefcaseIcon className="size-3.5" />}
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
              title="Completed Jobs"
              icon={<BriefcaseIcon className="size-3.5" />}
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
              icon={<DatabaseIcon className="size-3.5" />}
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
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <div className="rounded-xl bg-accent/50 p-3">
                <DatabaseIcon className="size-5 text-muted-foreground/40" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-foreground">
                  No cohorts yet
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[200px]">
                  Submit variant IDs to create a cohort for analysis
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setShowSubmit(true)}
              >
                <PlusIcon className="size-3.5" />
                Submit Variants
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
