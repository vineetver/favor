"use client";

import {
  BatchApiError,
  deleteCohort,
  getCohort,
  JobDetailView,
  listCohorts,
  useJobPolling,
} from "@features/batch";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GitBranch,
  Loader2,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const { job, isLoading, error, dataUpdatedAt, refetch } = useJobPolling({
    jobId,
    enabled: !isPaused,
  });

  const lastUpdated = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : null),
    [dataUpdatedAt],
  );

  // Fetch cohort detail for the label (the jobId in the URL is actually the cohort ID)
  const { data: cohort } = useQuery({
    queryKey: ["cohort-detail", jobId],
    queryFn: () => getCohort(jobId),
    enabled: !!jobId,
    staleTime: 60_000,
  });

  // Fetch derived sub-cohorts of this parent
  const { data: derivedData } = useQuery({
    queryKey: ["derived-cohorts", jobId],
    queryFn: () => listCohorts({ parent_id: jobId, limit: 50 }),
    enabled: !!jobId && !!job?.is_terminal,
    staleTime: 30_000,
  });

  // Filter client-side: only show cohorts that are actually derived from this parent
  const derivedCohorts = (derivedData?.cohorts ?? []).filter(
    (c) => c.source === "derived" && c.parent_id === jobId,
  );

  const handleCancel = useCallback(async () => {
    if (!jobId) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await deleteCohort(jobId);
      // Await all invalidations so isCancelling stays true until fresh data arrives.
      // Without this, the cancel button briefly reappears with stale "RUNNING" data.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cohort-status", jobId] }),
        queryClient.invalidateQueries({ queryKey: ["cohort-detail", jobId] }),
        queryClient.invalidateQueries({ queryKey: ["quotas"] }),
        queryClient.invalidateQueries({ queryKey: ["cohorts"] }),
      ]);
    } catch (err) {
      const message =
        err instanceof BatchApiError ? err.message : "Failed to cancel job";
      setCancelError(message);
    } finally {
      setIsCancelling(false);
    }
  }, [jobId, queryClient]);

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
  if (isLoading && !job) {
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
  if (error && !job) {
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

  // No data available
  if (!job) {
    return null;
  }

  const isTerminal = job.is_terminal;
  // Prefer cohort label over raw storage filename (which can be a UUID)
  const filename = cohort?.label || job.input?.filename;

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
            cohortId={jobId}
            filename={filename}
            onCancel={job.can_cancel ? handleCancel : undefined}
            onDownload={job.state === "COMPLETED" ? handleDownload : undefined}
            onDownloadManifest={
              // Only expose the manifest button if the backend actually
              // provided a manifest URL. The contract is optional — most
              // cohorts don't have one, and a button that silently does
              // nothing is worse than no button.
              job.state === "COMPLETED" && job.output?.manifest_url
                ? handleDownloadManifest
                : undefined
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

        {/* Derived Sub-cohorts */}
        {derivedCohorts.length > 0 && (
          <Card className="mt-6 border border-border py-0 gap-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Derived Cohorts
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({derivedCohorts.length})
                </span>
              </div>
              <div className="space-y-2">
                {derivedCohorts.map((dc) => (
                  <div
                    key={dc.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {dc.label || `Cohort ${dc.id.slice(0, 8)}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {dc.variant_count != null && (
                          <span>{dc.variant_count} variants</span>
                        )}
                        <span className="text-border">&middot;</span>
                        <span>{dc.status}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/batch-annotation/jobs/${dc.id}/analytics`}>
                        Open Analytics
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
