"use client";

import { cn } from "@infra/utils";

interface ConfidenceDotsProps {
  /** Number of filled dots (out of `max`). */
  count: number;
  /** Total dots to render. Default: 3. */
  max?: number;
}

/** Small row of filled/unfilled dots indicating a confidence or strength level. */
export function ConfidenceDots({ count, max = 3 }: ConfidenceDotsProps) {
  return (
    <span className="inline-flex gap-px">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[5px] w-[5px] rounded-full",
            i < count ? "bg-foreground/50" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}
