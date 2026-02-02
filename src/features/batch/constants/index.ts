/**
 * Shared constants for batch annotation
 */

import type { BadgeVariant } from "@shared/components/ui/status-badge";
import {
  CheckCircle2,
  Clock,
  Loader2,
  StopCircle,
  XCircle,
} from "lucide-react";
import type { JobState } from "../types";

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
