/**
 * Shared constants for batch annotation
 */

import type { BadgeVariant } from "@shared/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  Cog,
  Layers,
  Loader2,
  SortAsc,
  StopCircle,
  XCircle,
  Zap,
} from "lucide-react";
import type { CohortStatus, ErrorCode, ProcessingStage } from "../types";

// ============================================================================
// Cohort Status Config (keyed by backend status, not a frontend translation)
// ============================================================================

export interface StatusConfig {
  variant: BadgeVariant;
  icon: typeof Clock;
  label: string;
  animate?: boolean;
}

export const STATUS_CONFIG: Record<CohortStatus, StatusConfig> = {
  queued: { variant: "neutral", icon: Clock, label: "Queued" },
  validating: {
    variant: "primary",
    icon: Loader2,
    label: "Validating",
    animate: true,
  },
  running: {
    variant: "primary",
    icon: Loader2,
    label: "Processing",
    animate: true,
  },
  materializing: {
    variant: "primary",
    icon: Loader2,
    label: "Finalizing",
    animate: true,
  },
  ready: { variant: "positive", icon: CheckCircle2, label: "Completed" },
  failed: { variant: "negative", icon: XCircle, label: "Failed" },
  cancelled: { variant: "neutral", icon: StopCircle, label: "Cancelled" },
};

// Keep backward compat alias
export const JOB_STATE_CONFIG = {
  PENDING: STATUS_CONFIG.queued,
  RUNNING: STATUS_CONFIG.running,
  COMPLETED: STATUS_CONFIG.ready,
  FAILED: STATUS_CONFIG.failed,
  CANCEL_REQUESTED: {
    variant: "warning" as BadgeVariant,
    icon: Loader2,
    label: "Cancelling",
    animate: true,
  },
  CANCELLED: STATUS_CONFIG.cancelled,
};

// ============================================================================
// Processing Stage Config — keys match backend stage strings exactly
// ============================================================================

export interface StageConfig {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Clock;
  color: string;
}

export const STAGE_CONFIG: Record<ProcessingStage, StageConfig> = {
  Queued: {
    label: "Queued",
    shortLabel: "Queue",
    description: "Waiting in queue",
    icon: Clock,
    color: "slate-400",
  },
  Resolving: {
    label: "Resolving",
    shortLabel: "Resolve",
    description: "Reading input and resolving keys",
    icon: Zap,
    color: "blue-500",
  },
  Sorting: {
    label: "Sorting",
    shortLabel: "Sort",
    description: "Sorting for optimal access",
    icon: SortAsc,
    color: "indigo-500",
  },
  Processing: {
    label: "Processing",
    shortLabel: "Process",
    description: "Fetching variants and writing output",
    icon: Cog,
    color: "violet-500",
  },
  Enriching: {
    label: "Enriching",
    shortLabel: "Enrich",
    description: "Running enrichment packs",
    icon: Layers,
    color: "purple-500",
  },
  Done: {
    label: "Done",
    shortLabel: "Done",
    description: "Complete",
    icon: CheckCircle2,
    color: "emerald-500",
  },
};

export const STAGE_ORDER: ProcessingStage[] = [
  "Queued",
  "Resolving",
  "Sorting",
  "Processing",
  "Enriching",
  "Done",
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
    description:
      "The job failed after multiple attempts. This is usually temporary.",
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
    description:
      "The processing worker was interrupted. The job can be retried.",
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

// ============================================================================
// Typed Cohort Stage Config
// ============================================================================

export interface TypedCohortStageConfig {
  label: string;
  description: string;
}

export const TYPED_COHORT_STAGES: Record<string, TypedCohortStageConfig> = {
  validating: {
    label: "Validating",
    description: "Detecting data type and validating schema",
  },
  mapping: {
    label: "Column Mapping",
    description: "Reviewing and confirming column mappings",
  },
  profiling: {
    label: "Profiling",
    description: "Computing column statistics and summaries",
  },
  indexing: { label: "Indexing", description: "Building variant key index" },
  ready: { label: "Ready", description: "Cohort is ready for analysis" },
};

/** Get error recovery config with fallback for unknown codes */
export function getErrorRecovery(
  errorCode: ErrorCode | string,
): ErrorRecoveryConfig {
  if (errorCode in ERROR_RECOVERY_CONFIG) {
    return ERROR_RECOVERY_CONFIG[errorCode as ErrorCode];
  }
  return {
    title: "Error",
    description: String(errorCode),
    action: "retry",
    actionLabel: "Retry Job",
  };
}
