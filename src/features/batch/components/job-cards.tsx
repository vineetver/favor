"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import { StatusBadge } from "@shared/components/ui/status-badge";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  StopCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ERROR_RECOVERY_CONFIG, JOB_STATE_CONFIG } from "../constants";
import { formatBytes, formatDuration, formatNumber, formatTime } from "../lib/format";
import type {
  JobCancelled,
  JobCancelRequested,
  JobCompleted,
  JobFailed,
  JobPending,
  JobRunning,
} from "../types";
import { DedupStats } from "./dedup-stats";
import { EtaDisplay } from "./eta-display";
import { ProcessingPipeline } from "./processing-pipeline";
import { StatCard } from "./stat-card";

// ============================================================================
// Shared Components
// ============================================================================

function JobIdCopyButton({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jobId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jobId]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-1"
      >
        {jobId.slice(0, 8)}...
        <Copy className="w-3 h-3" />
      </button>
      {copied && <span className="text-xs text-emerald-600">Copied!</span>}
    </div>
  );
}

function LiveDuration({
  startedAt,
  completedAt,
}: {
  startedAt: string;
  completedAt?: string;
}) {
  const [duration, setDuration] = useState(() =>
    formatDuration(startedAt, completedAt)
  );

  useEffect(() => {
    if (completedAt) {
      setDuration(formatDuration(startedAt, completedAt));
      return;
    }

    const interval = setInterval(() => {
      setDuration(formatDuration(startedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  return <span>{duration}</span>;
}

// ============================================================================
// Pending Job Card
// ============================================================================

interface PendingJobCardProps {
  job: JobPending;
  filename?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  className?: string;
}

export function PendingJobCard({
  job,
  filename,
  onCancel,
  isCancelling,
  className,
}: PendingJobCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="neutral">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Queued
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Waiting in queue</p>
          <p className="text-xs text-slate-500 mt-1">
            Your job will start processing shortly
          </p>
        </div>
      </CardContent>

      {onCancel && (
        <CardFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Cancel
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// Running Job Card
// ============================================================================

interface RunningJobCardProps {
  job: JobRunning;
  filename?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  className?: string;
}

export function RunningJobCard({
  job,
  filename,
  onCancel,
  isCancelling,
  className,
}: RunningJobCardProps) {
  const { progress, eta } = job;

  // Calculate stat percentages
  const totalProcessed = progress.found + progress.not_found + progress.errors;
  const foundPercent = totalProcessed > 0 ? (progress.found / totalProcessed) * 100 : 0;
  const notFoundPercent = totalProcessed > 0 ? (progress.not_found / totalProcessed) * 100 : 0;
  const errorPercent = totalProcessed > 0 ? (progress.errors / totalProcessed) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="primary">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            Processing
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Pipeline visualization */}
        <ProcessingPipeline currentStage={progress.stage} />

        {/* Progress bar with percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">
              {formatNumber(progress.processed)} variants
            </span>
            <span className="text-slate-500">{Math.round(progress.percent)}%</span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={formatNumber(progress.found)}
            label="Found"
            percentage={`${foundPercent.toFixed(1)}%`}
          />
          <StatCard
            value={formatNumber(progress.not_found)}
            label="Not Found"
            percentage={`${notFoundPercent.toFixed(1)}%`}
          />
          <StatCard
            value={formatNumber(progress.errors)}
            label="Errors"
            percentage={`${errorPercent.toFixed(1)}%`}
            variant={progress.errors > 0 ? "negative" : "default"}
          />
        </div>

        {/* Footer info: Duration, ETA, Dedup */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span>
              Duration: <LiveDuration startedAt={job.started_at} />
            </span>
            <EtaDisplay eta={eta} />
          </div>
          <DedupStats
            totalRows={progress.total_rows}
            uniqueVids={progress.unique_vids}
            duplicates={progress.duplicates}
          />
        </div>
      </CardContent>

      {onCancel && (
        <CardFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Cancel
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// Cancel Requested Card
// ============================================================================

interface CancelRequestedJobCardProps {
  job: JobCancelRequested;
  filename?: string;
  className?: string;
}

export function CancelRequestedJobCard({
  job,
  filename,
  className,
}: CancelRequestedJobCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-amber-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-amber-200 px-6 py-4 bg-amber-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="warning">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            Cancelling
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          </div>
          <p className="text-sm font-medium text-amber-800">Cancellation in progress</p>
          <p className="text-xs text-amber-600 mt-1">
            Please wait while the job is being stopped
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Completed Job Card
// ============================================================================

interface CompletedJobCardProps {
  job: JobCompleted;
  filename?: string;
  onDownload?: () => void;
  onDownloadManifest?: () => void;
  onOpenAnalytics?: () => void;
  className?: string;
}

export function CompletedJobCard({
  job,
  filename,
  onDownload,
  onDownloadManifest,
  onOpenAnalytics,
  className,
}: CompletedJobCardProps) {
  const { progress, output } = job;

  // Calculate stat percentages
  const totalProcessed = progress.found + progress.not_found + progress.errors;
  const foundPercent = totalProcessed > 0 ? (progress.found / totalProcessed) * 100 : 0;
  const notFoundPercent = totalProcessed > 0 ? (progress.not_found / totalProcessed) * 100 : 0;
  const errorPercent = totalProcessed > 0 ? (progress.errors / totalProcessed) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="positive">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Completed
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Results download section */}
        <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Download className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Results Ready</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {output.bytes_human || formatBytes(output.bytes)} Arrow IPC format
                </p>
              </div>
            </div>
            {onDownload && (
              <Button type="button" onClick={onDownload}>
                <Download className="w-4 h-4" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={formatNumber(progress.found)}
            label="Found"
            percentage={`${foundPercent.toFixed(1)}%`}
            variant="positive"
          />
          <StatCard
            value={formatNumber(progress.not_found)}
            label="Not Found"
            percentage={`${notFoundPercent.toFixed(1)}%`}
          />
          <StatCard
            value={formatNumber(progress.errors)}
            label="Errors"
            percentage={`${errorPercent.toFixed(1)}%`}
            variant={progress.errors > 0 ? "negative" : "default"}
          />
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span>Completed: {formatTime(job.completed_at)}</span>
            <span className="font-medium">
              Duration: {job.timing.total_human || formatDuration(job.started_at, job.completed_at)}
            </span>
          </div>
          <DedupStats
            totalRows={progress.total_rows}
            uniqueVids={progress.unique_vids}
            duplicates={progress.duplicates}
          />
        </div>
      </CardContent>

      {/* Action footer */}
      <CardFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
        <div className="flex items-center justify-between w-full gap-3">
          {onDownloadManifest && (
            <Button type="button" variant="ghost" size="sm" onClick={onDownloadManifest}>
              <FileText className="w-4 h-4" />
              Manifest
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onOpenAnalytics && (
              <Button type="button" variant="outline" size="sm" onClick={onOpenAnalytics}>
                <ArrowUpRight className="w-4 h-4" />
                Open Analytics
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Failed Job Card
// ============================================================================

interface FailedJobCardProps {
  job: JobFailed;
  filename?: string;
  onRetry?: () => void;
  onNewJob?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function FailedJobCard({
  job,
  filename,
  onRetry,
  onNewJob,
  isRetrying,
  className,
}: FailedJobCardProps) {
  const recovery = ERROR_RECOVERY_CONFIG[job.error_code] ?? {
    title: "Error",
    description: job.error_message,
    action: job.retryable ? "retry" : "none",
    actionLabel: job.retryable ? "Retry Job" : undefined,
  };

  return (
    <Card className={cn("overflow-hidden border border-rose-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-rose-200 px-6 py-4 bg-rose-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="negative">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Failed
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Error details */}
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-800">{recovery.title}</p>
              <p className="text-sm text-rose-700 mt-1">
                {job.error_message || recovery.description}
              </p>
              {job.retryable && (
                <p className="text-xs text-rose-600 mt-2">
                  This error is temporary and can be retried.
                </p>
              )}
              {job.attempt > 1 && (
                <p className="text-xs text-rose-500 mt-1">
                  Attempted {job.attempt} time{job.attempt > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 mt-4 border-t border-slate-100">
          <span>Failed at: {formatTime(job.completed_at)}</span>
          <span className="font-mono text-rose-500">{job.error_code}</span>
        </div>
      </CardContent>

      <CardFooter className="border-t border-rose-200 px-6 py-4 bg-rose-50/30">
        <div className="flex items-center justify-end w-full gap-3">
          {recovery.action === "fix_input" && onNewJob && (
            <Button type="button" variant="outline" onClick={onNewJob}>
              {recovery.actionLabel || "Upload New File"}
            </Button>
          )}
          {recovery.action === "retry" && onRetry && (
            <Button type="button" onClick={onRetry} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {recovery.actionLabel || "Retry Job"}
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Cancelled Job Card
// ============================================================================

interface CancelledJobCardProps {
  job: JobCancelled;
  filename?: string;
  onNewJob?: () => void;
  className?: string;
}

export function CancelledJobCard({
  job,
  filename,
  onNewJob,
  className,
}: CancelledJobCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-slate-900 truncate mb-1">
                {filename}
              </h2>
            )}
            <JobIdCopyButton jobId={job.job_id} />
          </div>
          <StatusBadge variant="neutral">
            <StopCircle className="w-3.5 h-3.5 mr-1" />
            Cancelled
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <StopCircle className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Job was cancelled</p>
          <p className="text-xs text-slate-500 mt-1">
            Cancelled at {formatTime(job.completed_at)}
          </p>
        </div>
      </CardContent>

      {onNewJob && (
        <CardFooter className="border-t border-slate-200 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center justify-end w-full">
            <Button type="button" variant="outline" onClick={onNewJob}>
              Start New Job
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// Job Detail View - Parent Component that switches based on state
// ============================================================================

interface JobDetailViewProps {
  job:
    | JobPending
    | JobRunning
    | JobCancelRequested
    | JobCompleted
    | JobFailed
    | JobCancelled;
  filename?: string;
  onCancel?: () => void;
  onDownload?: () => void;
  onDownloadManifest?: () => void;
  onOpenAnalytics?: () => void;
  onRetry?: () => void;
  onNewJob?: () => void;
  isCancelling?: boolean;
  isRetrying?: boolean;
  className?: string;
}

export function JobDetailView({
  job,
  filename,
  onCancel,
  onDownload,
  onDownloadManifest,
  onOpenAnalytics,
  onRetry,
  onNewJob,
  isCancelling,
  isRetrying,
  className,
}: JobDetailViewProps) {
  switch (job.state) {
    case "PENDING":
      return (
        <PendingJobCard
          job={job}
          filename={filename}
          onCancel={onCancel}
          isCancelling={isCancelling}
          className={className}
        />
      );

    case "RUNNING":
      return (
        <RunningJobCard
          job={job}
          filename={filename}
          onCancel={onCancel}
          isCancelling={isCancelling}
          className={className}
        />
      );

    case "CANCEL_REQUESTED":
      return (
        <CancelRequestedJobCard
          job={job}
          filename={filename}
          className={className}
        />
      );

    case "COMPLETED":
      return (
        <CompletedJobCard
          job={job}
          filename={filename}
          onDownload={onDownload}
          onDownloadManifest={onDownloadManifest}
          onOpenAnalytics={onOpenAnalytics}
          className={className}
        />
      );

    case "FAILED":
      return (
        <FailedJobCard
          job={job}
          filename={filename}
          onRetry={onRetry}
          onNewJob={onNewJob}
          isRetrying={isRetrying}
          className={className}
        />
      );

    case "CANCELLED":
      return (
        <CancelledJobCard
          job={job}
          filename={filename}
          onNewJob={onNewJob}
          className={className}
        />
      );
  }
}
