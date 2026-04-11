"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@shared/components/ui/card";
import { StatusBadge } from "@shared/components/ui/status-badge";
import {
  AlertCircle,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  StopCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { JOB_STATE_CONFIG } from "../constants";
import { useTick } from "../hooks/use-tick";
import {
  formatBytes,
  formatDuration,
  formatNumber,
  formatTime,
} from "../lib/format";
import type { Job, JobProgress } from "../types";
import { StatCard } from "./stat-card";

interface JobProgressCardProps {
  job: Job;
  filename?: string;
  onCancel?: () => void;
  onDownload?: () => void;
  onDownloadManifest?: () => void;
  isCancelling?: boolean;
  className?: string;
}

/**
 * Helper to extract progress from any job state that has it
 */
function getJobProgress(job: Job): JobProgress | undefined {
  switch (job.state) {
    case "RUNNING":
    case "CANCEL_REQUESTED":
    case "COMPLETED":
      return job.progress;
    case "FAILED":
    case "CANCELLED":
      return job.progress;
    case "PENDING":
      return undefined;
  }
}

/**
 * Helper to get started_at from job states that have it
 */
function getStartedAt(job: Job): string | undefined {
  switch (job.state) {
    case "RUNNING":
    case "CANCEL_REQUESTED":
    case "COMPLETED":
      return job.started_at;
    case "FAILED":
    case "CANCELLED":
      return job.started_at;
    case "PENDING":
      return undefined;
  }
}

/**
 * Helper to get completed_at from terminal job states
 */
function getCompletedAt(job: Job): string | undefined {
  switch (job.state) {
    case "COMPLETED":
    case "FAILED":
    case "CANCELLED":
      return job.completed_at;
    default:
      return undefined;
  }
}

function LiveDuration({
  startedAt,
  completedAt,
}: {
  startedAt: string;
  completedAt?: string;
}) {
  const _tick = useTick();
  const duration = useMemo(
    () => formatDuration(startedAt, completedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startedAt, completedAt],
  );

  return <span>{duration}</span>;
}

// ============================================================================
// Main Component
// ============================================================================

export function JobProgressCard({
  job,
  filename,
  onCancel,
  onDownload,
  onDownloadManifest,
  isCancelling = false,
  className,
}: JobProgressCardProps) {
  const [copied, setCopied] = useState(false);

  const { state, timing } = job;
  const stateConfig = JOB_STATE_CONFIG[state];
  const StateIcon = stateConfig.icon;

  // Extract optional fields using helpers
  const progress = getJobProgress(job);
  const started_at = getStartedAt(job);
  const completed_at = getCompletedAt(job);

  // Get error message for failed jobs
  const error_message = job.state === "FAILED" ? job.error_message : undefined;

  // Get output for completed jobs
  const output = job.state === "COMPLETED" ? job.output : undefined;

  // Derived state
  const canCancel = job.can_cancel && onCancel;
  const isRunning = state === "RUNNING" || state === "PENDING";
  const isComplete = state === "COMPLETED";
  const isFailed = state === "FAILED";

  const handleCopyJobId = useCallback(() => {
    navigator.clipboard.writeText(job.job_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [job.job_id]);

  // Calculate stats percentages based on fetched count
  const totalFetched = progress?.fetched ?? 0;
  const foundPercent =
    totalFetched > 0 ? ((progress?.found ?? 0) / totalFetched) * 100 : 0;
  const notFoundPercent =
    totalFetched > 0 ? ((progress?.not_found ?? 0) / totalFetched) * 100 : 0;
  const errorPercent =
    totalFetched > 0 ? ((progress?.errors ?? 0) / totalFetched) * 100 : 0;

  // Get progress display based on stage
  const getProgressDisplay = () => {
    if (!progress) return null;
    switch (progress.stage) {
      case "Resolving":
        return `${formatNumber(progress.rows_resolved)} rows resolved`;
      case "Processing":
        return `${formatNumber(progress.fetched)} / ${formatNumber(progress.unique_vids ?? 0)} variants processed`;
      case "Enriching":
        return `Enriching${progress.current_pack ? `: ${progress.current_pack}` : ""} (${progress.packs_completed ?? 0}/${progress.packs_total ?? 0})`;
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
      {/* Header */}
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {filename && (
              <h2 className="text-base font-semibold text-foreground truncate mb-1">
                {filename}
              </h2>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJobId}
                className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded hover:bg-muted transition-colors flex items-center gap-1"
              >
                {job.job_id.slice(0, 8)}...
                <Copy className="w-3 h-3" />
              </button>
              {copied && (
                <span className="text-xs text-emerald-600">Copied!</span>
              )}
            </div>
          </div>
          <StatusBadge variant={stateConfig.variant}>
            <StateIcon
              className={cn(
                "w-3.5 h-3.5 mr-1",
                stateConfig.animate && "animate-spin",
              )}
            />
            {stateConfig.label}
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Error Message */}
        {isFailed && error_message && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-800">
                  Job Failed
                </p>
                <p className="text-sm text-rose-700 mt-1">{error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Section */}
        {progress && (
          <div className="space-y-4">
            {/* Processing Status - no spinner here, status badge in header already shows running state */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={
                  isRunning ? "font-medium" : "font-semibold text-foreground"
                }
              >
                {getProgressDisplay()}
              </span>
            </div>

            {/* Stats Grid - neutral colors unless there's something notable */}
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
          </div>
        )}

        {/* Timing Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
          <div className="flex items-center gap-4">
            {started_at && <span>Started: {formatTime(started_at)}</span>}
            {completed_at && <span>Completed: {formatTime(completed_at)}</span>}
          </div>
          <div className="flex items-center gap-4">
            {(timing?.total_human || started_at) && (
              <span className="font-medium">
                Duration:{" "}
                {timing?.total_human ??
                  (started_at && (
                    <LiveDuration
                      startedAt={started_at}
                      completedAt={completed_at}
                    />
                  ))}
              </span>
            )}
            {output && (
              <span>
                Output: {output.bytes_human ?? formatBytes(output.bytes)}
              </span>
            )}
          </div>
        </div>

        {/* Download Section for Completed Jobs */}
        {isComplete && output?.url && (
          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      Results Ready
                    </p>
                    <p className="text-xs text-emerald-600">
                      {output.bytes_human || formatBytes(output.bytes)}
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

            {output.manifest_url && onDownloadManifest && (
              <div className="p-4 bg-muted rounded-xl border border-border">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Manifest File
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Job metadata and checksums
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDownloadManifest}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Footer Actions */}
      {canCancel && (
        <CardFooter className="border-t border-border px-6 py-4 bg-muted/50">
          <div className="flex items-center justify-end w-full gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCancelling || state === "CANCEL_REQUESTED"}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Cancel Job
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
