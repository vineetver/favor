"use client";

import { Button } from "@shared/components/ui/button";
import { Card, CardContent } from "@shared/components/ui/card";
import {
  DEFAULT_TENANT_ID,
  getStoredJob,
  JobAnalytics,
  useJobPolling,
} from "@features/batch";
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

  // Poll for job status to get parquet URL
  const { job, isLoading, error } = useJobPolling({
    jobId,
    tenantId: DEFAULT_TENANT_ID,
    enabled: hasMounted,
  });

  // Loading state
  if (!hasMounted || (isLoading && !job)) {
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
              <p className="text-base font-medium text-slate-700">Loading job data...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Error state
  if (error && !job) {
    return (
      <div className="min-h-screen relative overflow-hidden text-slate-900">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/batch-annotation/jobs/${jobId}`}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Job
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

  // Check if job is completed and has parquet
  const isCompleted = job?.state === "COMPLETED";
  const parquet = job?.output?.parquet;
  const parquetReady = parquet?.state === "READY" && parquet.url;

  // Parquet not ready state
  if (!isCompleted) {
    return (
      <div className="min-h-screen relative overflow-hidden text-slate-900">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/batch-annotation/jobs/${jobId}`}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Job
            </Link>
          </div>

          <Card className="border border-slate-200 py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Job Not Complete</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
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

  // Parquet processing state
  if (!parquetReady) {
    const parquetState = parquet?.state;

    return (
      <div className="min-h-screen relative overflow-hidden text-slate-900">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
          <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
        </div>

        <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/batch-annotation/jobs/${jobId}`}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Job
            </Link>
          </div>

          <Card className="border border-slate-200 py-0 gap-0">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              {parquetState === "FAILED" ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Analytics Generation Failed
                  </h3>
                  <p className="text-sm text-slate-500 mb-2 max-w-sm">
                    {parquet?.error_message || "Failed to generate analytics data."}
                  </p>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Preparing Analytics Data
                  </h3>
                  <p className="text-sm text-slate-500 mb-2 max-w-sm">
                    {parquetState === "PENDING"
                      ? "Analytics data generation is queued..."
                      : "Generating optimized analytics file..."}
                  </p>
                  <p className="text-xs text-slate-400">
                    This page will automatically update when ready
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Analytics ready
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none print:hidden">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto print:pt-4 print:pb-4 print:px-4 print:max-w-none">
        {/* Header */}
        <div className="mb-8 print:mb-4">
          <Link
            href={`/batch-annotation/jobs/${jobId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6 print:hidden"
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
                <h1 className="text-2xl font-bold text-slate-900 print:text-xl">
                  Variant Analytics
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {storedJob?.filename || `Job ${jobId.slice(0, 8)}`}
                  {parquet?.bytes_human && (
                    <span className="ml-2 text-slate-400">
                      ({parquet.bytes_human})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg print:hidden">
              <button
                type="button"
                onClick={() => setViewMode("report")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "report"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
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
            parquetUrl={parquet.url!}
            jobId={jobId}
            filename={storedJob?.filename}
          />
        ) : (
          <JobAnalytics
            parquetUrl={parquet.url!}
            jobId={jobId}
            filename={storedJob?.filename}
          />
        )}
      </main>
    </div>
  );
}
