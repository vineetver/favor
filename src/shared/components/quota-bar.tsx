"use client";

import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { Quota } from "@shared/hooks/use-quotas";

// ---------------------------------------------------------------------------
// Single quota indicator — thin bar + label + reset hint
// ---------------------------------------------------------------------------

function QuotaIndicator({ quota }: { quota: Quota }) {
  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const isWarning = pct >= 80;
  const isExhausted = pct >= 100;
  const remaining = Math.max(0, quota.limit - quota.used);
  const label = formatQuotaLabel(quota.name);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col gap-1 min-w-0" role="group" aria-label={label}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground truncate">
              {label}
            </span>
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums",
                isExhausted
                  ? "text-destructive font-medium"
                  : isWarning
                    ? "text-amber-600"
                    : "text-muted-foreground",
              )}
            >
              {remaining} left
            </span>
          </div>
          <div
            className="h-1.5 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={quota.used}
            aria-valuemin={0}
            aria-valuemax={quota.limit}
            aria-label={`${label}: ${quota.used} of ${quota.limit} used`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isExhausted
                  ? "bg-destructive"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-primary/60",
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground/60">
            Resets {quota.resets}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {quota.used} of {quota.limit} used
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Compact variant for row layout — single line, no reset text
// ---------------------------------------------------------------------------

function QuotaIndicatorCompact({ quota }: { quota: Quota }) {
  const pct = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const isWarning = pct >= 80;
  const isExhausted = pct >= 100;
  const label = formatQuotaLabel(quota.name);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-[11px] text-muted-foreground truncate">
            {label}
          </span>
          <div
            className="flex-1 min-w-8 h-1.5 rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={quota.used}
            aria-valuemin={0}
            aria-valuemax={quota.limit}
            aria-label={`${label}: ${quota.used} of ${quota.limit} used`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isExhausted
                  ? "bg-destructive"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-primary/60",
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              isExhausted
                ? "text-destructive font-medium"
                : isWarning
                  ? "text-amber-600"
                  : "text-muted-foreground",
            )}
          >
            {quota.used}/{quota.limit}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>{quota.used} of {quota.limit} used</p>
        <p className="opacity-70">Resets {quota.resets}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// QuotaBar — renders a filtered set of quotas
// ---------------------------------------------------------------------------

interface QuotaBarProps {
  quotas: Quota[];
  /** Names to show. If omitted, shows all. */
  filter?: string[];
  /** "row" = compact single-line indicators, "column" = full indicators with reset info */
  layout?: "row" | "column";
  className?: string;
}

export function QuotaBar({
  quotas,
  filter,
  layout = "column",
  className,
}: QuotaBarProps) {
  const visible = filter
    ? quotas.filter((q) => filter.includes(q.name))
    : quotas;

  if (visible.length === 0) return null;

  const Indicator = layout === "row" ? QuotaIndicatorCompact : QuotaIndicator;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          layout === "row"
            ? "flex flex-wrap items-center gap-x-4 gap-y-2"
            : "flex flex-col gap-2.5",
          className,
        )}
      >
        {visible.map((q) => (
          <Indicator key={q.name} quota={q} />
        ))}
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a human-friendly label from the raw API quota name. */
function formatQuotaLabel(name: string): string {
  return name
    .replace(/_today$/, "")
    .replace(/_per_day$/, "")
    .replace(/^max_/, "")
    .replace(/^concurrent_cohorts$/, "active_jobs")
    .replace(/^large_uploads/, "jobs_over_1M_variants")
    .replace(/^small_uploads/, "jobs_under_1M_variants")
    .replace(/^concurrent_/, "active ")
    .replaceAll("_", " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
