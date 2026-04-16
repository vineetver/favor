"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@shared/components/ui/card";
import { Progress } from "@shared/components/ui/progress";
import { StatusBadge } from "@shared/components/ui/status-badge";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  RefreshCw,
  StopCircle,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ERROR_RECOVERY_CONFIG } from "../constants";
import { useTick } from "../hooks/use-tick";
import {
  formatBytes,
  formatDuration,
  formatNumber,
  formatTime,
} from "../lib/format";
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

function IdCopyButton({ id, label }: { id: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [id]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-auto px-2 py-0.5 text-xs font-mono bg-muted hover:bg-muted"
      >
        {label || `${id.slice(0, 8)}...`}
        <Copy className="w-3 h-3" />
      </Button>
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
  // Uses a single global interval shared across all LiveDuration instances
  const _tick = useTick();
  const duration = useMemo(
    () => formatDuration(startedAt, completedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives re-compute for live durations
    [startedAt, completedAt],
  );

  return <span>{duration}</span>;
}

// ============================================================================
// Pending Job Card
// ============================================================================

interface PendingJobCardProps {
  job: JobPending;
  displayId: string;
  filename?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  className?: string;
}

export function PendingJobCard({
  job,
  displayId,
  filename,
  onCancel,
  isCancelling,
  className,
}: PendingJobCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-border py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
          </div>
          <StatusBadge variant="neutral">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Queued
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Waiting in queue
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your job will start processing shortly
          </p>
        </div>
      </CardContent>

      {onCancel && (
        <CardFooter className="border-t border-border px-6 py-4 bg-muted/50">
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
  displayId: string;
  filename?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  className?: string;
}

export function RunningJobCard({
  job,
  displayId,
  filename,
  onCancel,
  isCancelling,
  className,
}: RunningJobCardProps) {
  const { progress, eta } = job;
  const isEnriching = progress.stage === "Enriching";

  // Annotation stats (always available once past RESOLVING)
  const totalProcessed = progress.fetched || 0;
  const foundPercent =
    totalProcessed > 0 ? (progress.found / totalProcessed) * 100 : 0;
  const notFoundPercent =
    totalProcessed > 0 ? (progress.not_found / totalProcessed) * 100 : 0;
  const errorPercent =
    totalProcessed > 0 ? (progress.errors / totalProcessed) * 100 : 0;

  // Enrichment progress (only during ENRICHING)
  const packsTotal = progress.packs_total ?? 0;
  const packsCompleted = progress.packs_completed ?? 0;
  const enrichmentPercent =
    packsTotal > 0 ? (packsCompleted / packsTotal) * 100 : 0;

  // Display percent: enrichment progress during ENRICHING, annotation otherwise
  const _displayPercent = isEnriching
    ? enrichmentPercent
    : (progress.percent ?? 0);

  const getProgressLabel = () => {
    switch (progress.stage) {
      case "Resolving":
        return `${formatNumber(progress.rows_resolved)} rows`;
      case "Processing": {
        // Backend's `fetched` counts rows processed (including duplicates),
        // not distinct variants — so the right denominator is total_rows.
        // Fall back to fetched-only if total_rows is unknown.
        const total = progress.total_rows ?? 0;
        if (total > 0) {
          return `${formatNumber(progress.fetched)} / ${formatNumber(total)} rows`;
        }
        return `${formatNumber(progress.fetched)} rows processed`;
      }
      case "Enriching":
        return progress.current_pack
          ? `Enriching: ${progress.current_pack}`
          : "Running enrichment packs";
      default:
        return progress.stage_description;
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
          </div>
          <StatusBadge variant="primary">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            {isEnriching ? "Enriching" : "Processing"}
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Pipeline visualization */}
        <ProcessingPipeline currentStage={progress.stage} />

        {isEnriching ? (
          <>
            {/* Phase 1: Annotation — done */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-800">
                  Annotation complete
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-emerald-700 ml-5.5">
                <span>{formatNumber(progress.found)} found</span>
                <span>{formatNumber(progress.not_found)} not found</span>
                {progress.errors > 0 && (
                  <span className="text-destructive">
                    {formatNumber(progress.errors)} errors
                  </span>
                )}
              </div>
            </div>

            {/* Phase 2: Enrichment — active */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  {getProgressLabel()}
                </span>
                <span className="text-muted-foreground">
                  {packsCompleted}/{packsTotal} packs
                </span>
              </div>
              <Progress
                value={Math.min(100, enrichmentPercent)}
                className="h-2"
              />
            </div>
          </>
        ) : (
          <>
            {/* Annotation progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  {getProgressLabel()}
                </span>
                <span className="text-muted-foreground">
                  {Math.min(100, Math.round(progress.percent ?? 0))}%
                </span>
              </div>
              <Progress
                value={Math.min(100, progress.percent ?? 0)}
                className="h-2"
              />
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
          </>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <span>
              Duration: <LiveDuration startedAt={job.started_at} />
            </span>
            <EtaDisplay eta={eta} />
          </div>
          {progress.total_rows != null && (
            <DedupStats
              totalRows={progress.total_rows}
              uniqueVids={progress.unique_vids ?? 0}
              duplicates={progress.duplicates ?? 0}
            />
          )}
        </div>
      </CardContent>

      {onCancel && (
        <CardFooter className="border-t border-border px-6 py-4 bg-muted/50">
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
  displayId: string;
  filename?: string;
  className?: string;
}

export function CancelRequestedJobCard({
  job,
  displayId,
  filename,
  className,
}: CancelRequestedJobCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-amber-200 py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-amber-200 px-6 py-4 bg-amber-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
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
          <p className="text-sm font-medium text-amber-800">
            Cancellation in progress
          </p>
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
  displayId: string;
  filename?: string;
  onDownload?: () => void;
  onDownloadManifest?: () => void;
  onOpenAnalytics?: () => void;
  onOpenAgent?: () => void;
  className?: string;
}

export function CompletedJobCard({
  job,
  displayId,
  filename,
  onDownload,
  onDownloadManifest,
  onOpenAnalytics,
  onOpenAgent,
  className,
}: CompletedJobCardProps) {
  const { progress, output } = job;

  // Calculate stat percentages
  const totalProcessed = progress.found + progress.not_found + progress.errors;
  const foundPercent =
    totalProcessed > 0 ? (progress.found / totalProcessed) * 100 : 0;
  const notFoundPercent =
    totalProcessed > 0 ? (progress.not_found / totalProcessed) * 100 : 0;
  const errorPercent =
    totalProcessed > 0 ? (progress.errors / totalProcessed) * 100 : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border border-border py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
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
                <p className="text-sm font-semibold text-emerald-900">
                  Results Ready
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {output.bytes_human || formatBytes(output.bytes)} Parquet
                  format
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
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            <span>Completed: {formatTime(job.completed_at)}</span>
            <span className="font-medium">
              Duration:{" "}
              {job.timing.total_human ||
                formatDuration(job.started_at, job.completed_at)}
            </span>
          </div>
          {progress.total_rows != null && (
            <DedupStats
              totalRows={progress.total_rows}
              uniqueVids={progress.unique_vids ?? 0}
              duplicates={progress.duplicates ?? 0}
            />
          )}
        </div>
      </CardContent>

      {/* Action footer */}
      <CardFooter className="border-t border-border px-6 py-4 bg-muted/50">
        <div className="flex items-center justify-between w-full gap-3">
          {onDownloadManifest && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDownloadManifest}
            >
              <FileText className="w-4 h-4" />
              Manifest
            </Button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onOpenAgent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAgent}
              >
                <MessageSquareText className="w-4 h-4" />
                Open in AI Agent
              </Button>
            )}
            {onOpenAnalytics && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenAnalytics}
              >
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
  displayId: string;
  filename?: string;
  onRetry?: () => void;
  onNewJob?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function FailedJobCard({
  job,
  displayId,
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
    <Card
      className={cn(
        "overflow-hidden border border-rose-200 py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-rose-200 px-6 py-4 bg-rose-50/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
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
              <p className="text-sm font-semibold text-rose-800">
                {recovery.title}
              </p>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 mt-4 border-t border-border">
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
  displayId: string;
  filename?: string;
  onNewJob?: () => void;
  className?: string;
}

export function CancelledJobCard({
  job,
  displayId,
  filename,
  onNewJob,
  className,
}: CancelledJobCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border border-border py-0 gap-0",
        className,
      )}
    >
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <IdCopyButton id={displayId} />
          </div>
          <StatusBadge variant="neutral">
            <StopCircle className="w-3.5 h-3.5 mr-1" />
            Cancelled
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <StopCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Job was cancelled
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cancelled at {formatTime(job.completed_at)}
          </p>
        </div>
      </CardContent>

      {onNewJob && (
        <CardFooter className="border-t border-border px-6 py-4 bg-muted/50">
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
  cohortId?: string;
  filename?: string;
  onCancel?: () => void;
  onDownload?: () => void;
  onDownloadManifest?: () => void;
  onOpenAnalytics?: () => void;
  onOpenAgent?: () => void;
  onRetry?: () => void;
  onNewJob?: () => void;
  isCancelling?: boolean;
  isRetrying?: boolean;
  className?: string;
}

export function JobDetailView({
  job,
  cohortId,
  filename,
  onCancel,
  onDownload,
  onDownloadManifest,
  onOpenAnalytics,
  onOpenAgent,
  onRetry,
  onNewJob,
  isCancelling,
  isRetrying,
  className,
}: JobDetailViewProps) {
  // Use cohort ID for display when available; fall back to job_id
  const displayId = cohortId || job.job_id;

  switch (job.state) {
    case "PENDING":
      return (
        <PendingJobCard
          job={job}
          displayId={displayId}
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
          displayId={displayId}
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
          displayId={displayId}
          filename={filename}
          className={className}
        />
      );

    case "COMPLETED":
      return (
        <CompletedJobCard
          job={job}
          displayId={displayId}
          filename={filename}
          onDownload={onDownload}
          onDownloadManifest={onDownloadManifest}
          onOpenAnalytics={onOpenAnalytics}
          onOpenAgent={onOpenAgent}
          className={className}
        />
      );

    case "FAILED":
      return (
        <FailedJobCard
          job={job}
          displayId={displayId}
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
          displayId={displayId}
          filename={filename}
          onNewJob={onNewJob}
          className={className}
        />
      );
  }
}
