"use client";

import { Badge } from "@shared/components/ui/badge";
import { Progress } from "@shared/components/ui/progress";
import { cn } from "@infra/utils";
import {
  CheckCircle2Icon,
  ClockIcon,
  XCircleIcon,
  Loader2Icon,
  BanIcon,
} from "lucide-react";
import type { StoredJob } from "@features/batch/types";
import { useJobPolling } from "@features/batch/hooks";
import { DEFAULT_TENANT_ID } from "@features/batch/config";
import { formatDate } from "@features/batch/lib/format";

const STATE_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    icon: <ClockIcon className="size-3" />,
  },
  RUNNING: {
    label: "Running",
    variant: "default",
    icon: <Loader2Icon className="size-3 animate-spin" />,
  },
  COMPLETED: {
    label: "Done",
    variant: "secondary",
    icon: <CheckCircle2Icon className="size-3 text-emerald-600" />,
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircleIcon className="size-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "outline",
    icon: <BanIcon className="size-3" />,
  },
  CANCEL_REQUESTED: {
    label: "Cancelling",
    variant: "outline",
    icon: <Loader2Icon className="size-3 animate-spin" />,
  },
};

interface JobListItemProps {
  job: StoredJob;
  onClick?: (job: StoredJob) => void;
}

export function JobListItem({ job, onClick }: JobListItemProps) {
  const isActive =
    job.state === "PENDING" ||
    job.state === "RUNNING" ||
    job.state === "CANCEL_REQUESTED";

  const { job: liveJob } = useJobPolling({
    jobId: isActive ? job.job_id : null,
    tenantId: job.tenant_id || DEFAULT_TENANT_ID,
    enabled: isActive,
  });

  const state = liveJob?.state ?? job.state;
  const progress =
    liveJob && "progress" in liveJob && liveJob.progress
      ? liveJob.progress
      : job.progress;
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.PENDING;

  return (
    <button
      type="button"
      onClick={() => onClick?.(job)}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg p-2.5 text-left text-xs transition-colors",
        "hover:bg-accent",
        onClick && "cursor-pointer",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {job.filename}
        </span>
        <Badge variant={config.variant} className="shrink-0 gap-1 text-[10px]">
          {config.icon}
          {config.label}
        </Badge>
      </div>

      {state === "RUNNING" && progress?.percent != null && (
        <Progress value={progress.percent} className="h-1" />
      )}

      <span className="text-[10px] text-muted-foreground">
        {formatDate(job.created_at)}
        {job.estimated_rows != null &&
          ` · ~${job.estimated_rows.toLocaleString()} rows`}
      </span>
    </button>
  );
}
