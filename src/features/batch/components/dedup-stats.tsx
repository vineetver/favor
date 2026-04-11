"use client";

import { cn } from "@infra/utils";
import { formatNumber } from "../lib/format";

interface DedupStatsProps {
  totalRows: number;
  uniqueVids: number;
  duplicates: number;
  className?: string;
}

/**
 * Compact deduplication statistics display
 *
 * Only shows when there are duplicates worth mentioning.
 * Apple-style: minimal, informative, not cluttered.
 */
export function DedupStats({
  totalRows,
  uniqueVids,
  duplicates,
  className,
}: DedupStatsProps) {
  // Only show if there are meaningful duplicates (more than 1%)
  const duplicatePercent = totalRows > 0 ? (duplicates / totalRows) * 100 : 0;

  if (duplicates === 0 || duplicatePercent < 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>{formatNumber(uniqueVids)} unique</span>
      <span className="text-muted-foreground/50">|</span>
      <span className="text-muted-foreground">
        {formatNumber(duplicates)} duplicates ({duplicatePercent.toFixed(0)}%)
      </span>
    </div>
  );
}
