"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { cn } from "@infra/utils";
import {
  ChevronDownIcon,
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
// Collapsible section helper
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
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {isOpen ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {count != null && count > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
            {count}
          </span>
        )}
      </button>
      {isOpen && children}
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
  // ---- Submit panel visibility ----
  const [showSubmit, setShowSubmit] = useState(false);

  // ---- Cohorts (localStorage-backed) ----
  const [cohorts, setCohorts] = useState<AgentCohort[]>([]);

  useEffect(() => {
    setCohorts(getStoredCohorts());
  }, []);

  const handleCohortCreated = useCallback((cohort: AgentCohort) => {
    const updated = addStoredCohort(cohort);
    setCohorts(updated);
  }, []);

  const handleCohortRemoved = useCallback((cohortId: string) => {
    const updated = removeStoredCohort(cohortId);
    setCohorts(updated);
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

  // ---- Jobs (shared localStorage from batch feature, refreshed periodically) ----
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
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <DnaIcon className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">FAVOR-GPT</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Genomic research workspace
          </p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setShowSubmit(!showSubmit)}
          title="Submit variants"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Submit Panel */}
        {showSubmit && (
          <div className="border-b border-border p-4">
            <VariantSubmitPanel
              onCohortCreated={handleCohortCreated}
              onAnalyzeCohort={handleAnalyzeCohort}
            />
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="border-b border-border">
            <SidebarSection
              title="Active Jobs"
              icon={<BriefcaseIcon className="size-3.5" />}
              count={activeJobs.length}
              defaultOpen
            >
              <div className="space-y-0.5 px-2 pb-2">
                {activeJobs.map((job) => (
                  <JobListItem key={job.job_id} job={job} />
                ))}
              </div>
            </SidebarSection>
          </div>
        )}

        {/* Completed Jobs */}
        {completedJobs.length > 0 && (
          <div className="border-b border-border">
            <SidebarSection
              title="Completed Jobs"
              icon={<BriefcaseIcon className="size-3.5" />}
              count={completedJobs.length}
            >
              <div className="space-y-0.5 px-2 pb-2">
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
          </div>
        )}

        {/* Cohorts */}
        {cohorts.length > 0 && (
          <div className="border-b border-border">
            <SidebarSection
              title="Cohorts"
              icon={<DatabaseIcon className="size-3.5" />}
              count={cohorts.length}
              defaultOpen
            >
              <div className="space-y-0.5 px-2 pb-2">
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
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <DatabaseIcon className="size-8 text-muted-foreground/40" />
            <div>
              <p className="text-xs font-medium text-foreground">
                No cohorts yet
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Paste variant IDs or upload a file to create a cohort for
                analysis.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubmit(true)}
            >
              <PlusIcon className="size-3.5" />
              Submit Variants
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
