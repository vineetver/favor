/**
 * Shared constants for batch annotation
 */

import type { BadgeVariant } from "@shared/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  Database,
  FileOutput,
  Loader2,
  SortAsc,
  StopCircle,
  XCircle,
  Zap,
} from "lucide-react";
import type { ErrorCode, JobState, ProcessingStage } from "../types";

// ============================================================================
// Job State Config
// ============================================================================

export interface JobStateConfig {
  variant: BadgeVariant;
  icon: typeof Clock;
  label: string;
  animate?: boolean;
}

export const JOB_STATE_CONFIG: Record<JobState, JobStateConfig> = {
  PENDING: {
    variant: "neutral",
    icon: Clock,
    label: "Pending",
  },
  RUNNING: {
    variant: "primary",
    icon: Loader2,
    label: "Running",
    animate: true,
  },
  COMPLETED: {
    variant: "positive",
    icon: CheckCircle2,
    label: "Completed",
  },
  FAILED: {
    variant: "negative",
    icon: XCircle,
    label: "Failed",
  },
  CANCEL_REQUESTED: {
    variant: "warning",
    icon: Loader2,
    label: "Cancelling",
    animate: true,
  },
  CANCELLED: {
    variant: "neutral",
    icon: StopCircle,
    label: "Cancelled",
  },
};

// ============================================================================
// Processing Stage Config
// ============================================================================

export interface StageConfig {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Clock;
  color: string; // Tailwind color class (e.g., "blue-500")
}

export const STAGE_CONFIG: Record<ProcessingStage, StageConfig> = {
  QUEUED: {
    label: "Queued",
    shortLabel: "Queue",
    description: "Waiting for worker pickup",
    icon: Clock,
    color: "slate-400",
  },
  RESOLVING: {
    label: "Resolving",
    shortLabel: "Resolve",
    description: "Converting keys to variant IDs",
    icon: Zap,
    color: "blue-500",
  },
  SORTING: {
    label: "Sorting",
    shortLabel: "Sort",
    description: "Sorting VIDs for efficient lookup",
    icon: SortAsc,
    color: "indigo-500",
  },
  FETCHING: {
    label: "Fetching",
    shortLabel: "Fetch",
    description: "Fetching variant data from database",
    icon: Database,
    color: "violet-500",
  },
  WRITING: {
    label: "Writing",
    shortLabel: "Write",
    description: "Writing output to storage",
    icon: FileOutput,
    color: "purple-500",
  },
  DONE: {
    label: "Done",
    shortLabel: "Done",
    description: "Processing complete",
    icon: CheckCircle2,
    color: "emerald-500",
  },
};

// Ordered list of stages for pipeline visualization
export const STAGE_ORDER: ProcessingStage[] = [
  "QUEUED",
  "RESOLVING",
  "SORTING",
  "FETCHING",
  "WRITING",
  "DONE",
];

// ============================================================================
// Error Recovery Config (Resurrection principle)
// ============================================================================

export type ErrorAction = "retry" | "fix_input" | "contact_support" | "none";

export interface ErrorRecoveryConfig {
  title: string;
  description: string;
  action: ErrorAction;
  actionLabel?: string;
}

export const ERROR_RECOVERY_CONFIG: Record<ErrorCode, ErrorRecoveryConfig> = {
  CANCELLED: {
    title: "Job Cancelled",
    description: "This job was cancelled at your request.",
    action: "none",
  },
  MAX_ATTEMPTS_EXCEEDED: {
    title: "Temporary Failure",
    description: "The job failed after multiple attempts. This is usually temporary.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  EMPTY_FILE: {
    title: "Empty File",
    description: "The uploaded file contains no data.",
    action: "fix_input",
    actionLabel: "Upload Different File",
  },
  INVALID_FORMAT: {
    title: "Invalid Format",
    description: "The file format could not be parsed.",
    action: "fix_input",
    actionLabel: "Check File Format",
  },
  NO_KEY_COLUMN: {
    title: "No Variant IDs Found",
    description: "Could not identify a column containing variant identifiers.",
    action: "fix_input",
    actionLabel: "Verify Column Headers",
  },
  FILE_TOO_LARGE: {
    title: "File Too Large",
    description: "The file exceeds the maximum size limit.",
    action: "fix_input",
    actionLabel: "Split Into Smaller Files",
  },
  INPUT_NOT_FOUND: {
    title: "File Not Found",
    description: "The uploaded file could not be located. It may have expired.",
    action: "fix_input",
    actionLabel: "Re-upload File",
  },
  ROCKSDB_UNAVAILABLE: {
    title: "Database Unavailable",
    description: "The variant database is temporarily unavailable.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  S3_UNAVAILABLE: {
    title: "Storage Unavailable",
    description: "Cloud storage is temporarily unavailable.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  TIMEOUT: {
    title: "Job Timed Out",
    description: "The job exceeded the maximum runtime.",
    action: "retry",
    actionLabel: "Retry with Smaller File",
  },
  LEASE_LOST: {
    title: "Worker Interrupted",
    description: "The processing worker was interrupted. The job can be retried.",
    action: "retry",
    actionLabel: "Retry Job",
  },
  INTERNAL_ERROR: {
    title: "Internal Error",
    description: "An unexpected error occurred.",
    action: "contact_support",
    actionLabel: "Contact Support",
  },
};

/**
 * Get error recovery config for an error code
 * Returns a default config for unknown error codes
 */
export function getErrorRecovery(errorCode: ErrorCode | string): ErrorRecoveryConfig {
  if (errorCode in ERROR_RECOVERY_CONFIG) {
    return ERROR_RECOVERY_CONFIG[errorCode as ErrorCode];
  }
  // Default for unknown errors
  return {
    title: "Error",
    description: String(errorCode),
    action: "retry",
    actionLabel: "Retry Job",
  };
}
