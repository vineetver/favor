"use client";

import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  DEFAULT_TENANT_ID,
  getStoredJob,
  JobAnalytics,
  useJobPolling,
} from "@features/batch";
import type { Job, JobOutput } from "@features/batch";
import { JobAnalyticsReport } from "@features/batch/components/job-analytics-report";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  Database,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Helper to get output from completed jobs
 */
function getJobOutput(job: Job): JobOutput | undefined {
  return job.state === "COMPLETED" ? job.output : undefined;
}

interface AnalyticsClientProps {
  jobId: string;
}

type ViewMode = "report" | "query";

export function AnalyticsClient({ jobId }: AnalyticsClientProps) {
  const [storedJob, setStoredJob] = useState<ReturnType<typeof getStoredJob>>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("report");

  // Load from localStorage after mount
  useEffect(() => {
    setStoredJob(getStoredJob(jobId));
    setHasMounted(true);
  }, [jobId]);

  // Poll for job status to get output URL
  const { job, isLoading, error } = useJobPolling({
    jobId,
    tenantId: DEFAULT_TENANT_ID,
    enabled: hasMounted,
  });

  // Loading state
  if (!hasMounted || (isLoading && !job)) {
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
              <p className="text-base font-medium text-foreground">Loading job data...</p>
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
              <h3 className="text-lg font-semibold text-foreground mb-2">Job Not Found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                The job you&apos;re looking for doesn&apos;t exist or may have expired.
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

  // Job not completed state
  if (!isCompleted || !output) {
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
              <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Job Not Complete</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Analytics are available once the job has completed processing.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/batch-annotation/jobs/${jobId}`}>
                  <ArrowLeft className="w-4 h-4" />
                  View Job Status
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
          <Link
            href={`/batch-annotation/jobs/${jobId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 print:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center print:hidden">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground print:text-xl">
                  Cohort Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {storedJob?.filename || `Job ${jobId.slice(0, 8)}`}
                  {output?.bytes_human && (
                    <span className="ml-2 text-muted-foreground">
                      ({output.bytes_human})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg print:hidden">
              <button
                type="button"
                onClick={() => setViewMode("report")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "report"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                Report
              </button>
              <button
                type="button"
                onClick={() => setViewMode("query")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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

        {/* Analytics Component */}
        {viewMode === "report" ? (
          <JobAnalyticsReport
            dataUrl={output.url}
            jobId={jobId}
            filename={storedJob?.filename}
          />
        ) : (
          <JobAnalytics
            dataUrl={output.url}
            jobId={jobId}
            filename={storedJob?.filename}
          />
        )}
      </main>
    </div>
  );
}
