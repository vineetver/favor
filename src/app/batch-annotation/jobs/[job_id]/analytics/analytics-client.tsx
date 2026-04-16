"use client";

import type { Job, JobOutput, ShareErrorCode } from "@features/batch";
import {
  getCohort,
  getShareErrorCode,
  JobAnalytics,
  useJobPolling,
  useShareToken,
} from "@features/batch";
import { IgvfLipidReport } from "@features/batch/components/igvf-lipid-report";
import { JobAnalyticsReport } from "@features/batch/components/job-analytics-report";
import { ShareDialog } from "@features/batch/components/share-dialog";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  Database,
  FileText,
  FlaskConical,
  Link2Off,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/**
 * Helper to get output from completed jobs
 */
function getJobOutput(job: Job): JobOutput | undefined {
  return job.state === "COMPLETED" ? job.output : undefined;
}

/**
 * Filename + size line under the page title.
 *
 * Filenames from user uploads can be arbitrarily long (we've seen 60+ char
 * compound names). Truncate with ellipsis, keep the size visible at the end,
 * and expose the full name via a hover tooltip.
 */
function FileMeta({
  filename,
  fallbackId,
  bytesHuman,
}: {
  filename?: string;
  fallbackId: string;
  bytesHuman?: string;
}) {
  const displayName = filename || `Job ${fallbackId.slice(0, 8)}`;

  return (
    <div className="mt-0.5 flex items-center gap-2 min-w-0 text-sm text-muted-foreground">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate min-w-0 cursor-default">{displayName}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md break-all">
          {displayName}
        </TooltipContent>
      </Tooltip>
      {bytesHuman && (
        <span className="shrink-0 tabular-nums">({bytesHuman})</span>
      )}
    </div>
  );
}

interface AnalyticsClientProps {
  jobId: string;
}

type ViewMode = "report" | "igvf" | "query";

export function AnalyticsClient({ jobId }: AnalyticsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("report");
  const shareToken = useShareToken();
  const isSharedView = !!shareToken;

  // Poll for job status to get output URL
  const { job, isLoading, error } = useJobPolling({
    jobId,
    shareToken,
  });

  // Fetch cohort detail with fresh presigned URLs (include_urls=true).
  // Presigned S3 URLs expire — always refetch to avoid stale 403s.
  // Share-token viewers get short-TTL URLs so we refetch even more aggressively.
  const { data: cohortDetail } = useQuery({
    queryKey: [
      "cohort-detail-analytics",
      jobId,
      shareToken ? "shared" : "owner",
    ],
    queryFn: () => getCohort(jobId, true, shareToken ?? undefined),
    enabled: job?.state === "COMPLETED",
    staleTime: 0,
  });

  const shareErrorCode: ShareErrorCode | null = getShareErrorCode(error);

  const hasIgvfLipid =
    cohortDetail?.enrichments?.analyses?.some((a) => a.name === "igvf_lipid") ??
    false;

  // Use fresh URL from cohort detail — NOT from polling cache which may have expired
  const freshDataUrl = cohortDetail?.output?.url;

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
                Loading job data...
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Share-link error state (revoked / expired / invalid / scope).
  // Takes precedence over the generic error below — the message is tailored.
  if (shareErrorCode) {
    const copy: Record<ShareErrorCode, { title: string; body: string }> = {
      SHARE_REVOKED: {
        title: "Share link revoked",
        body: "The owner has revoked this link. Ask them for a new one to view this analytics report.",
      },
      SHARE_EXPIRED: {
        title: "Share link expired",
        body: "This share link has passed its expiry date. Ask the owner to issue a new one.",
      },
      SHARE_INVALID: {
        title: "Invalid share link",
        body: "This link is malformed or the token is unrecognized. Double-check the URL you were sent.",
      },
      SHARE_SCOPE: {
        title: "Not allowed on this link",
        body: "This share link doesn't grant access to the resource you're trying to view.",
      },
    };
    const { title, body } = copy[shareErrorCode];
    return (
      <div className="min-h-screen relative overflow-hidden text-foreground">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <Card className="border border-border py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Link2Off className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {body}
              </p>
              <Button variant="outline" asChild>
                <Link href="/">Return home</Link>
              </Button>
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
              href={`/batch-annotation/jobs/${jobId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Job
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
              <Button variant="outline" asChild>
                <Link href="/batch-annotation/jobs">
                  <ArrowLeft className="w-4 h-4" />
                  View All Jobs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Check if job is completed and has output
  const isCompleted = job?.state === "COMPLETED";
  const output = job ? getJobOutput(job) : undefined;

  // Job not completed
  if (!isCompleted || !output) {
    return (
      <div className="min-h-screen relative overflow-hidden text-foreground">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          {!isSharedView && (
            <div className="mb-8">
              <Link
                href={`/batch-annotation/jobs/${jobId}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Job
              </Link>
            </div>
          )}

          <Card className="border border-border py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Job Not Complete
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Analytics are available once the job has completed processing.
              </p>
              <Button variant="outline" asChild>
                <Link
                  href={isSharedView ? "/" : `/batch-annotation/jobs/${jobId}`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isSharedView ? "Return home" : "View Job Status"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Analytics ready - output is available on completed jobs
  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none print:hidden">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto print:pt-4 print:pb-4 print:px-4 print:max-w-none">
        {/* Header */}
        <div className="mb-8 print:mb-4">
          {/* Nav row: owner only. Shared viewers can't navigate back to the
              owner's job detail page. */}
          {!isSharedView && (
            <div className="mb-6 print:hidden">
              <Link
                href={`/batch-annotation/jobs/${jobId}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Job
              </Link>
            </div>
          )}

          {/* min-w-0 on the text column lets the filename truncate instead of
              pushing the Share button off-screen. */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center print:hidden">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-foreground print:text-xl">
                  Cohort Analytics
                </h1>
                <FileMeta
                  filename={job?.input?.filename}
                  fallbackId={jobId}
                  bytesHuman={output?.bytes_human}
                />
              </div>
            </div>

            {!isSharedView && (
              <div className="shrink-0 print:hidden">
                <ShareDialog cohortId={jobId} />
              </div>
            )}
          </div>

          {/* Horizontal scroll on narrow screens; bleed to the viewport edge so
              the scrollable area isn't clipped by the page gutter. */}
          <div className="mt-6 print:hidden -mx-6 sm:mx-0 px-6 sm:px-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("report")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === "report"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                Variant Report
              </button>
              {hasIgvfLipid && (
                <button
                  type="button"
                  onClick={() => setViewMode("igvf")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    viewMode === "igvf"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FlaskConical className="w-4 h-4" />
                  IGVF Lipid Analysis
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewMode("query")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === "query"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Database className="w-4 h-4" />
                SQL Query
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Component — prefer freshDataUrl, fall back to polling URL */}
        {(() => {
          const dataUrl = freshDataUrl || output.url;
          return viewMode === "report" ? (
            <JobAnalyticsReport
              dataUrl={dataUrl}
              jobId={jobId}
              filename={job?.input?.filename}
            />
          ) : viewMode === "igvf" ? (
            <IgvfLipidReport
              cohortId={jobId}
              dataUrl={dataUrl}
              shareToken={shareToken}
            />
          ) : (
            <JobAnalytics
              dataUrl={dataUrl}
              jobId={jobId}
              filename={job?.input?.filename}
            />
          );
        })()}
      </main>
    </div>
  );
}
