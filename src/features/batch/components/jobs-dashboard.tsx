"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Input } from "@shared/components/ui/input";
import { StatusBadge } from "@shared/components/ui/status-badge";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JOB_STATE_CONFIG } from "../constants";
import { formatDate, formatNumber, formatBytes } from "../lib/format";
import { getStoredJobs, removeJob } from "../lib/job-storage";
import type { StoredJob, JobState } from "../types";

interface JobsDashboardProps {
  className?: string;
}

type StatusFilter = "all" | "active" | "completed" | "failed";
type SortOption = "newest" | "oldest" | "largest" | "name";

// ============================================================================
// Status Filter Tabs
// ============================================================================

function StatusTabs({
  active,
  onChange,
  counts,
}: {
  active: StatusFilter;
  onChange: (filter: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  const tabs: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={active === tab.id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(tab.id)}
          className={cn(
            active === tab.id && "bg-white shadow-sm",
          )}
        >
          {tab.label}
          {counts[tab.id] > 0 && (
            <span
              className={cn(
                "ml-1.5 text-xs",
                active === tab.id ? "text-slate-500" : "text-slate-400",
              )}
            >
              {counts[tab.id]}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// Sort Dropdown
// ============================================================================

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (value: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { id: SortOption; label: string }[] = [
    { id: "newest", label: "Newest first" },
    { id: "oldest", label: "Oldest first" },
    { id: "largest", label: "Largest first" },
    { id: "name", label: "Name A-Z" },
  ];

  const current = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        {current?.label}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {options.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full justify-start",
                  value === option.id && "text-primary font-medium",
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Job Card with Kebab Menu
// ============================================================================

function JobCard({
  job,
  onRemove,
}: {
  job: StoredJob;
  onRemove: (jobId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stateConfig = JOB_STATE_CONFIG[job.state];
  const StateIcon = stateConfig.icon;
  const isActive =
    job.state === "PENDING" ||
    job.state === "RUNNING" ||
    job.state === "CANCEL_REQUESTED";
  const isComplete = job.state === "COMPLETED";
  const isFailed = job.state === "FAILED";

  const handleDelete = () => {
    if (confirmDelete) {
      onRemove(job.job_id);
      setConfirmDelete(false);
      setMenuOpen(false);
    } else {
      setConfirmDelete(true);
    }
  };

  // Reset confirm state when menu closes
  useEffect(() => {
    if (!menuOpen) {
      setConfirmDelete(false);
    }
  }, [menuOpen]);

  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg border bg-white transition-all hover:shadow-sm group",
        isActive && "border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isActive
              ? "bg-primary/10"
              : isComplete
                ? "bg-emerald-50"
                : isFailed
                  ? "bg-rose-50"
                  : "bg-slate-100",
          )}
        >
          <FileSpreadsheet
            className={cn(
              "w-4 h-4",
              isActive
                ? "text-primary"
                : isComplete
                  ? "text-emerald-600"
                  : isFailed
                    ? "text-rose-500"
                    : "text-slate-400",
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-slate-900 truncate">
              {job.filename}
            </span>
            <StatusBadge variant={stateConfig.variant} className="shrink-0">
              <StateIcon
                className={cn("w-3 h-3 mr-1", stateConfig.animate && "animate-spin")}
              />
              {stateConfig.label}
              {job.state === "RUNNING" && job.progress?.percent != null && (
                <span className="ml-1 tabular-nums">{Math.round(job.progress.percent)}%</span>
              )}
            </StatusBadge>
          </div>

          {/* Metadata line */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{formatDate(job.created_at)}</span>
            {job.estimated_rows && (
              <>
                <span className="text-slate-300">·</span>
                <span>{formatNumber(job.estimated_rows)} rows</span>
              </>
            )}
            {job.progress && (
              <>
                <span className="text-slate-300">·</span>
                <span>{formatNumber(job.progress.found)} found</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/batch-annotation/jobs/${job.job_id}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>

          {/* Kebab Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-slate-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                  <Link
                    href={`/batch-annotation/jobs/${job.job_id}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View details
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(job.job_id);
                      setMenuOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Copy className="w-4 h-4" />
                    Copy job ID
                  </Button>

                  {!isActive && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className={cn(
                          "w-full justify-start",
                          confirmDelete && "text-rose-600",
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                        {confirmDelete ? "Confirm delete?" : "Remove from list"}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ filter }: { filter: StatusFilter }) {
  const messages: Record<StatusFilter, { title: string; desc: string }> = {
    all: {
      title: "No batch jobs yet",
      desc: "Upload a VCF or CSV file to start annotating your variants.",
    },
    active: {
      title: "No active jobs",
      desc: "Jobs that are running or pending will appear here.",
    },
    completed: {
      title: "No completed jobs",
      desc: "Successfully finished jobs will appear here.",
    },
    failed: {
      title: "No failed jobs",
      desc: "Jobs that encountered errors will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <FileSpreadsheet className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{msg.title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">{msg.desc}</p>
      {filter === "all" && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/batch-annotation">
            <Plus className="w-4 h-4" />
            Create New Job
          </Link>
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Info Banner
// ============================================================================

function StorageBanner() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
      <HardDrive className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-800">
          <span className="font-medium">Jobs stored locally.</span>{" "}
          <span className="text-blue-600">
            Job history is saved in your browser. Clearing browser data will remove this list,
            but your results remain available via direct links.
          </span>
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobsDashboard({ className }: JobsDashboardProps) {
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  // Load jobs from localStorage after mount
  useEffect(() => {
    setJobs(getStoredJobs());
    setHasMounted(true);
  }, []);

  // Refresh periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(getStoredJobs());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = useCallback((jobId: string) => {
    removeJob(jobId);
    setJobs(getStoredJobs());
  }, []);

  // Status counts
  const counts = useMemo(() => {
    const active = jobs.filter(
      (j) => j.state === "PENDING" || j.state === "RUNNING" || j.state === "CANCEL_REQUESTED",
    ).length;
    const completed = jobs.filter((j) => j.state === "COMPLETED").length;
    const failed = jobs.filter((j) => j.state === "FAILED" || j.state === "CANCELLED").length;
    return {
      all: jobs.length,
      active,
      completed,
      failed,
    };
  }, [jobs]);

  // Filter by status
  const statusFilteredJobs = useMemo(() => {
    switch (statusFilter) {
      case "active":
        return jobs.filter(
          (j) => j.state === "PENDING" || j.state === "RUNNING" || j.state === "CANCEL_REQUESTED",
        );
      case "completed":
        return jobs.filter((j) => j.state === "COMPLETED");
      case "failed":
        return jobs.filter((j) => j.state === "FAILED" || j.state === "CANCELLED");
      default:
        return jobs;
    }
  }, [jobs, statusFilter]);

  // Filter by search
  const searchFilteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredJobs;
    const query = searchQuery.toLowerCase();
    return statusFilteredJobs.filter(
      (job) =>
        job.filename.toLowerCase().includes(query) ||
        job.job_id.toLowerCase().includes(query),
    );
  }, [statusFilteredJobs, searchQuery]);

  // Sort
  const sortedJobs = useMemo(() => {
    const sorted = [...searchFilteredJobs];
    switch (sortOption) {
      case "oldest":
        return sorted.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      case "largest":
        return sorted.sort((a, b) => (b.estimated_rows || 0) - (a.estimated_rows || 0));
      case "name":
        return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      default: // newest
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
  }, [searchFilteredJobs, sortOption]);

  return (
    <Card className={cn("overflow-hidden border border-slate-200 py-0 gap-0", className)}>
      {/* Header */}
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Batch Jobs</CardTitle>
            {hasMounted && jobs.length > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">
                {counts.active} active · {counts.completed} completed
              </p>
            )}
          </div>
          <Button size="sm" asChild>
            <Link href="/batch-annotation">
              <Plus className="w-4 h-4" />
              New Job
            </Link>
          </Button>
        </div>
      </CardHeader>

      {/* Filters Bar */}
      {hasMounted && jobs.length > 0 && (
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between gap-4">
            <StatusTabs active={statusFilter} onChange={setStatusFilter} counts={counts} />

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-white"
                />
              </div>

              {/* Sort */}
              <SortDropdown value={sortOption} onChange={setSortOption} />
            </div>
          </div>
        </div>
      )}

      <CardContent className="p-6">
        {/* Loading State */}
        {!hasMounted && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {hasMounted && sortedJobs.length === 0 && (
          <EmptyState filter={searchQuery ? "all" : statusFilter} />
        )}

        {/* Job List */}
        {hasMounted && sortedJobs.length > 0 && (
          <div className="space-y-2">
            {sortedJobs.map((job) => (
              <JobCard key={job.job_id} job={job} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </CardContent>

      {/* Storage Info Banner */}
      {hasMounted && jobs.length > 0 && (
        <div className="px-6 pb-6">
          <StorageBanner />
        </div>
      )}
    </Card>
  );
}
