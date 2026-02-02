"use client";

import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  BatchApiError,
  cancelJob,
  DEFAULT_TENANT_ID,
  getStoredJob,
  JobProgressCard,
  useJobPolling,
} from "@features/batch";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface JobDetailClientProps {
  jobId: string;
}

// ============================================================================
// Progress Timeline
// ============================================================================

interface TimelineStep {
  id: string;
  label: string;
  icon: typeof Upload;
  status: "completed" | "current" | "pending";
}

function ProgressTimeline({ state }: { state: string }) {
  const steps: TimelineStep[] = [
    {
      id: "upload",
      label: "Upload",
      icon: Upload,
      status:
        state === "PENDING" ? "current" : ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"].includes(state) ? "completed" : "pending",
    },
    {
      id: "validate",
      label: "Validate",
      icon: FileSpreadsheet,
      status:
        state === "PENDING" ? "completed" : ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"].includes(state) ? "completed" : "pending",
    },
    {
      id: "annotate",
      label: "Annotate",
      icon: Zap,
      status:
        state === "RUNNING" || state === "CANCEL_REQUESTED"
          ? "current"
          : ["COMPLETED", "FAILED", "CANCELLED"].includes(state)
            ? "completed"
            : "pending",
    },
    {
      id: "export",
      label: "Export",
      icon: CheckCircle2,
      status: state === "COMPLETED" ? "completed" : "pending",
    },
  ];

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium
                  ${step.status === "completed" ? "bg-emerald-100 text-emerald-600" : ""}
                  ${step.status === "current" ? "bg-primary/10 text-primary ring-2 ring-primary" : ""}
                  ${step.status === "pending" ? "bg-slate-100 text-slate-400" : ""}
                `}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.status === "current" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  step.status === "current"
                    ? "text-primary"
                    : step.status === "completed"
                      ? "text-slate-700"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="flex-1 mx-2 h-0.5 rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    step.status === "completed" ? "bg-emerald-400 w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Auto-refresh Indicator
// ============================================================================

function RefreshIndicator({
  lastUpdated,
  isPaused,
  onTogglePause,
  onRefresh,
}: {
  lastUpdated: Date | null;
  isPaused: boolean;
  onTogglePause: () => void;
  onRefresh: () => void;
}) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!lastUpdated) return;

    const update = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo("just now");
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else {
        setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>Updated {timeAgo}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onTogglePause}
          className="h-6 w-6"
          title={isPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
        >
          {isPaused ? (
            <Play className="w-3 h-3" />
          ) : (
            <Pause className="w-3 h-3" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRefresh}
          className="h-6 w-6"
          title="Refresh now"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JobDetailClient({ jobId }: JobDetailClientProps) {
  const [storedJob, setStoredJob] = useState<ReturnType<typeof getStoredJob>>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setStoredJob(getStoredJob(jobId));
    setHasMounted(true);
  }, [jobId]);

  const { job, isLoading, error, refetch } = useJobPolling({
    jobId,
    tenantId: DEFAULT_TENANT_ID,
    enabled: hasMounted && !isPaused,
  });

  // Track last update time
  useEffect(() => {
    if (job) {
      setLastUpdated(new Date());
    }
  }, [job]);

  useEffect(() => {
    if (job) {
      setStoredJob((prev) =>
        prev
          ? { ...prev, state: job.state, progress: job.progress }
          : null,
      );
    }
  }, [job]);

  const handleCancel = useCallback(async () => {
    if (!jobId) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelJob(jobId, DEFAULT_TENANT_ID);
      refetch();
    } catch (err) {
      const message = err instanceof BatchApiError ? err.message : "Failed to cancel job";
      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  }, [jobId, refetch]);

  const handleDownload = useCallback(() => {
    if (job?.output?.url) {
      const link = document.createElement("a");
      link.href = job.output.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [job?.output?.url]);

  const handleDownloadManifest = useCallback(() => {
    if (job?.output?.manifest_url) {
      const link = document.createElement("a");
      link.href = job.output.manifest_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [job?.output?.manifest_url]);

  // Loading state
  if (!hasMounted || (isLoading && !job && !storedJob)) {
    return (
      <div className="min-h-screen relative overflow-hidden text-slate-900">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <Card className="border border-slate-200 py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-base font-medium text-slate-700">Loading job details...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !job && !storedJob) {
    return (
      <div className="min-h-screen relative overflow-hidden text-slate-900">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/batch-annotation/jobs"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>

          <Card className="border border-slate-200 py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Job Not Found</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                The job you&apos;re looking for doesn&apos;t exist or may have expired.
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/batch-annotation/jobs">
                    <ArrowLeft className="w-4 h-4" />
                    View All Jobs
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const displayJob = job || (storedJob ? {
    job_id: storedJob.job_id,
    tenant_id: storedJob.tenant_id,
    state: storedJob.state,
    progress: storedJob.progress || { processed: 0, found: 0, not_found: 0, errors: 0 },
    created_at: storedJob.created_at,
    attempt: 1,
    can_cancel: storedJob.state === "PENDING" || storedJob.state === "RUNNING",
    is_terminal: storedJob.state === "COMPLETED" || storedJob.state === "FAILED" || storedJob.state === "CANCELLED",
    input: { bytes: 0, bytes_human: "0 B", filename: storedJob.filename },
    timing: { total_ms: 0, total_human: "0s" },
  } : null);

  if (!displayJob) {
    return null;
  }

  const isTerminal = job?.is_terminal ?? (displayJob.state === "COMPLETED" || displayJob.state === "FAILED" || displayJob.state === "CANCELLED");

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/batch-annotation/jobs"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>

            {!isTerminal && (
              <RefreshIndicator
                lastUpdated={lastUpdated}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
                onRefresh={refetch}
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <div />
            <Button variant="outline" size="sm" asChild>
              <Link href="/batch-annotation">New Job</Link>
            </Button>
          </div>
        </div>

        {/* Progress Timeline */}
        {!isTerminal && (
          <Card className="mb-6 border border-slate-200 py-0 gap-0">
            <CardContent className="p-4">
              <ProgressTimeline state={displayJob.state} />
            </CardContent>
          </Card>
        )}

        {/* Job Progress Card */}
        <JobProgressCard
          job={displayJob as any}
          filename={storedJob?.filename}
          onCancel={displayJob.can_cancel ? handleCancel : undefined}
          onDownload={job?.output?.url ? handleDownload : undefined}
          onDownloadManifest={job?.output?.manifest_url ? handleDownloadManifest : undefined}
          isCancelling={isCancelling}
        />

        {/* Analytics Card */}
        {job?.state === "COMPLETED" && (
          <Card className="mt-6 border border-slate-200 py-0 gap-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Variant Analytics</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.output?.parquet?.state === "READY"
                        ? "Explore your results with SQL queries"
                        : job.output?.parquet?.state === "PROCESSING"
                          ? "Analytics data is being prepared..."
                          : job.output?.parquet?.state === "FAILED"
                            ? "Analytics generation failed"
                            : "Analytics data is queued"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={job.output?.parquet?.state === "READY" ? "default" : "outline"}
                  size="sm"
                  asChild={job.output?.parquet?.state === "READY"}
                  disabled={job.output?.parquet?.state !== "READY"}
                >
                  {job.output?.parquet?.state === "READY" ? (
                    <Link href={`/batch-annotation/jobs/${jobId}/analytics`}>
                      <BarChart3 className="w-4 h-4" />
                      Open Analytics
                    </Link>
                  ) : job.output?.parquet?.state === "PROCESSING" ? (
                    <>
                      <Clock className="w-4 h-4" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      Not Available
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancel Error */}
        {cancelError && (
          <div className="mt-6 rounded-xl bg-rose-50 border border-rose-200 px-6 py-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <p className="text-sm text-rose-700">{cancelError}</p>
            </div>
          </div>
        )}

        {/* Safe to leave message */}
        {!isTerminal && (
          <p className="mt-6 text-center text-sm text-slate-500">
            You can leave this page — your job will continue processing in the background.
          </p>
        )}
      </main>
    </div>
  );
}
