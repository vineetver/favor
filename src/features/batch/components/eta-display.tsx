"use client";

import { cn } from "@infra/utils";
import type { JobEta } from "../types";

interface EtaDisplayProps {
  eta?: JobEta;
  className?: string;
}

/**
 * Smart ETA display with human-readable format
 *
 * Shows:
 * - "~X min remaining" for minutes
 * - "~X sec remaining" for seconds
 * - "Almost done..." when under 10 seconds
 * - Nothing when no ETA available
 */
export function EtaDisplay({ eta, className }: EtaDisplayProps) {
  if (!eta) return null;

  const { seconds } = eta;

  // Format based on remaining time
  let display: string;
  if (seconds < 10) {
    display = "Almost done...";
  } else if (seconds < 60) {
    display = `~${seconds}s remaining`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    display = `~${minutes} min remaining`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    display = `~${hours}h ${minutes}m remaining`;
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {display}
    </span>
  );
}
