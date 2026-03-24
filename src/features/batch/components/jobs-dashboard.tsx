"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
import { Input } from "@shared/components/ui/input";
import {
  ArrowRight,
  ArrowUpDown,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatDate, formatNumber } from "../lib/format";
import { deleteCohort } from "../api";
import { useCohorts } from "../hooks/use-cohorts";
import { useQuotas } from "@shared/hooks/use-quotas";
import { QuotaBar } from "@shared/components/quota-bar";
import type { CohortListItem, CohortStatus } from "../types";

interface JobsDashboardProps {
  className?: string;
}

type StatusFilter = "all" | "active" | "completed" | "failed";
type SortOption = "newest" | "oldest" | "name";

// ============================================================================
// Helpers
// ============================================================================

function isActiveStatus(status: CohortStatus): boolean {
  return (
    status === "queued" ||
    status === "running" ||
    status === "materializing" ||
    status === "validating"
  );
}

function isCompletedStatus(status: CohortStatus): boolean {
  return status === "ready";
}

function isFailedStatus(status: CohortStatus): boolean {
  return status === "failed" || status === "cancelled";
}

function cohortStatusLabel(status: CohortStatus): string {
  const labels: Record<CohortStatus, string> = {
    validating: "Validating",
    queued: "Queued",
    running: "Running",
    materializing: "Materializing",
    ready: "Ready",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

function cohortStatusVariant(
  status: CohortStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (isActiveStatus(status)) return "default";
  if (isCompletedStatus(status)) return "secondary";
  if (isFailedStatus(status)) return "destructive";
  return "outline";
}

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
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={active === tab.id ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onChange(tab.id)}
          className={cn(
            active === tab.id && "bg-background shadow-sm",
          )}
        >
          {tab.label}
          {counts[tab.id] > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
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
          <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
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
// Cohort Card
// ============================================================================

function CohortCard({
  cohort,
  onRemove,
}: {
  cohort: CohortListItem;
  onRemove: (id: string) => void;
}) {
  const isActive = isActiveStatus(cohort.status);
  const isComplete = isCompletedStatus(cohort.status);
  const isFailed = isFailedStatus(cohort.status);

  return (
    <div
      className={cn(
        "relative px-4 py-3 rounded-lg border bg-background transition-all hover:shadow-sm group",
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
                ? "bg-emerald-500/10"
                : isFailed
                  ? "bg-destructive/10"
                  : "bg-muted",
          )}
        >
          {isActive ? (
            <Loader2
              className="w-4 h-4 text-primary animate-spin"
            />
          ) : (
            <FileSpreadsheet
              className={cn(
                "w-4 h-4",
                isComplete
                  ? "text-emerald-600"
                  : isFailed
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground truncate">
              {cohort.label || `Cohort ${cohort.id.slice(0, 8)}`}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                isActive && "bg-primary/10 text-primary",
                isComplete && "bg-emerald-500/10 text-emerald-700",
                isFailed && "bg-destructive/10 text-destructive",
              )}
            >
              {cohortStatusLabel(cohort.status)}
            </span>
          </div>

          {/* Metadata line */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(cohort.created_at)}</span>
            {cohort.variant_count != null && (
              <>
                <span className="text-border">&middot;</span>
                <span>{formatNumber(cohort.variant_count)} variants</span>
              </>
            )}
            {cohort.source && (
              <>
                <span className="text-border">&middot;</span>
                <span>{cohort.source}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/batch-annotation/jobs/${cohort.id}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>

          {/* Kebab Menu — portaled via Radix so it escapes overflow:hidden */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem asChild>
                <Link href={`/batch-annotation/jobs/${cohort.id}`}>
                  <ExternalLink className="w-4 h-4" />
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(cohort.id)}
              >
                <Copy className="w-4 h-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemove(cohort.id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      title: "No cohorts yet",
      desc: "Upload a VCF or CSV file to start annotating your variants.",
    },
    active: {
      title: "No active cohorts",
      desc: "Cohorts that are processing will appear here.",
    },
    completed: {
      title: "No completed cohorts",
      desc: "Successfully finished cohorts will appear here.",
    },
    failed: {
      title: "No failed cohorts",
      desc: "Cohorts that encountered errors will appear here.",
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{msg.title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">{msg.desc}</p>
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
// Main Component
// ============================================================================

export function JobsDashboard({ className }: JobsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const { cohorts, isLoading, refetch } = useCohorts();
  const { quotas } = useQuotas();

  const handleRemove = useCallback(
    async (id: string) => {
      await deleteCohort(id);
      refetch();
    },
    [refetch],
  );

  // Status counts
  const counts = useMemo(() => {
    const active = cohorts.filter((c) => isActiveStatus(c.status)).length;
    const completed = cohorts.filter((c) => isCompletedStatus(c.status)).length;
    const failed = cohorts.filter((c) => isFailedStatus(c.status)).length;
    return {
      all: cohorts.length,
      active,
      completed,
      failed,
    };
  }, [cohorts]);

  // Filter by status
  const statusFilteredCohorts = useMemo(() => {
    switch (statusFilter) {
      case "active":
        return cohorts.filter((c) => isActiveStatus(c.status));
      case "completed":
        return cohorts.filter((c) => isCompletedStatus(c.status));
      case "failed":
        return cohorts.filter((c) => isFailedStatus(c.status));
      default:
        return cohorts;
    }
  }, [cohorts, statusFilter]);

  // Filter by search
  const searchFilteredCohorts = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredCohorts;
    const query = searchQuery.toLowerCase();
    return statusFilteredCohorts.filter(
      (c) =>
        (c.label?.toLowerCase().includes(query)) ||
        c.id.toLowerCase().includes(query),
    );
  }, [statusFilteredCohorts, searchQuery]);

  // Sort
  const sortedCohorts = useMemo(() => {
    const sorted = [...searchFilteredCohorts];
    switch (sortOption) {
      case "oldest":
        return sorted.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      case "name":
        return sorted.sort((a, b) =>
          (a.label ?? "").localeCompare(b.label ?? ""),
        );
      default: // newest
        return sorted.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
  }, [searchFilteredCohorts, sortOption]);

  return (
    <Card className={cn("overflow-hidden border border-border py-0 gap-0", className)}>
      {/* Header */}
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Batch Jobs</CardTitle>
            {cohorts.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {counts.active} active &middot; {counts.completed} completed
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

      {/* Usage limits */}
      {quotas.length > 0 && (
        <div className="px-6 py-2.5 border-b border-border">
          <QuotaBar
            quotas={quotas}
            filter={["concurrent_cohorts", "large_uploads_today", "small_uploads_today"]}
            layout="row"
          />
        </div>
      )}

      {/* Filters Bar */}
      {cohorts.length > 0 && (
        <div className="px-6 py-3 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between gap-4">
            <StatusTabs active={statusFilter} onChange={setStatusFilter} counts={counts} />

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 bg-background"
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
        {isLoading && cohorts.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedCohorts.length === 0 && (
          <EmptyState filter={searchQuery ? "all" : statusFilter} />
        )}

        {/* Cohort List */}
        {sortedCohorts.length > 0 && (
          <div className="space-y-2">
            {sortedCohorts.map((cohort) => (
              <CohortCard key={cohort.id} cohort={cohort} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
