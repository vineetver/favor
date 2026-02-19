"use client";

import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  BatchApiError,
  cancelJob,
  DEFAULT_TENANT_ID,
  getStoredJob,
  JobDetailView,
  useJobPolling,
} from "@features/batch";
import type { Job } from "@features/batch";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface JobDetailClientProps {
  jobId: string;
}

// ============================================================================
// Auto-refresh Indicator (minimal, unobtrusive)
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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
  const router = useRouter();
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

  // Sync stored job with latest (only when job changes)
  useEffect(() => {
    if (job) {
      setStoredJob((prev) =>
        prev
          ? {
              ...prev,
              state: job.state,
              progress:
                job.state === "RUNNING" ||
                job.state === "CANCEL_REQUESTED" ||
                job.state === "COMPLETED"
                  ? job.progress
                  : job.state === "FAILED" || job.state === "CANCELLED"
                    ? job.progress
                    : undefined,
            }
          : null
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
      const message =
        err instanceof BatchApiError ? err.message : "Failed to cancel job";
      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  }, [jobId, refetch]);

  const handleDownload = useCallback(() => {
    if (job?.state === "COMPLETED" && job.output?.url) {
      const link = document.createElement("a");
      link.href = job.output.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [job]);

  const handleDownloadManifest = useCallback(() => {
    if (job?.state === "COMPLETED" && job.output?.manifest_url) {
      const link = document.createElement("a");
      link.href = job.output.manifest_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [job]);

  const handleOpenAnalytics = useCallback(() => {
    router.push(`/batch-annotation/jobs/${jobId}/analytics`);
  }, [router, jobId]);

  const handleOpenAgent = useCallback(() => {
    router.push("/agent");
  }, [router]);

  const handleNewJob = useCallback(() => {
    router.push("/batch-annotation");
  }, [router]);

  // Loading state
  if (!hasMounted || (isLoading && !job && !storedJob)) {
    return (
      <div className="min-h-screen relative overflow-hidden text-foreground">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <Card className="border border-border py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-base font-medium text-foreground">
                Loading job details...
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !job && !storedJob) {
    return (
      <div className="min-h-screen relative overflow-hidden text-foreground">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/batch-annotation/jobs"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>
          </div>

          <Card className="border border-border py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Job Not Found
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                The job you&apos;re looking for doesn&apos;t exist or may have
                expired.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
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

  // Use job from API if available, otherwise construct from stored job
  if (!job && !storedJob) {
    return null;
  }

  const isTerminal =
    job?.is_terminal ??
    (storedJob?.state === "COMPLETED" ||
      storedJob?.state === "FAILED" ||
      storedJob?.state === "CANCELLED");

  const filename = storedJob?.filename ?? job?.input?.filename;

  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/batch-annotation/jobs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>

          <div className="flex items-center gap-4">
            {!isTerminal && (
              <RefreshIndicator
                lastUpdated={lastUpdated}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
                onRefresh={refetch}
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/batch-annotation">New Job</Link>
            </Button>
          </div>
        </div>

        {/* Job Card - State-specific rendering */}
        {job && (
          <JobDetailView
            job={job}
            filename={filename}
            onCancel={job.can_cancel ? handleCancel : undefined}
            onDownload={job.state === "COMPLETED" ? handleDownload : undefined}
            onDownloadManifest={
              job.state === "COMPLETED" ? handleDownloadManifest : undefined
            }
            onOpenAnalytics={
              job.state === "COMPLETED" ? handleOpenAnalytics : undefined
            }
            onOpenAgent={
              job.state === "COMPLETED" ? handleOpenAgent : undefined
            }
            onNewJob={handleNewJob}
            isCancelling={isCancelling}
          />
        )}

        {/* Cancel Error */}
        {cancelError && (
          <div className="mt-6 rounded-xl bg-destructive/10 border border-destructive/20 px-6 py-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{cancelError}</p>
            </div>
          </div>
        )}

        {/* Safe to leave message */}
        {!isTerminal && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            You can leave this page — your job will continue processing in the
            background.
          </p>
        )}
      </main>
    </div>
  );
}
