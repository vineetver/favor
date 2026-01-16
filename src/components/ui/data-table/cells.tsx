"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Badge cell for categorical data (e.g., variant consequences, clinical significance) */
export function DataTableBadge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  className?: string;
}) {
  const variants = {
    default: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/60",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
    error: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60",
    info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/60",
    purple: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Score cell with color bar indicator (e.g., CADD score) */
export function DataTableScore({
  value,
  max = 100,
  thresholds = { low: 10, medium: 20, high: 30 },
  showBar = true,
  precision = 2,
}: {
  value: number | null | undefined;
  max?: number;
  thresholds?: { low: number; medium: number; high: number };
  showBar?: boolean;
  precision?: number;
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  const percentage = Math.min((value / max) * 100, 100);
  const color =
    value >= thresholds.high
      ? "bg-red-500"
      : value >= thresholds.medium
      ? "bg-amber-500"
      : value >= thresholds.low
      ? "bg-emerald-500"
      : "bg-slate-300";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-data font-semibold text-slate-900 tabular-nums">
        {value.toFixed(precision)}
      </span>
      {showBar && (
        <div className="h-1 w-16 bg-slate-200 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

/** Progress bar cell (e.g., allele frequency, percentages) */
export function DataTableProgress({
  value,
  max = 1,
  color = "blue",
  showValue = true,
  format = "percent",
}: {
  value: number | null | undefined;
  max?: number;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "slate" | "pink";
  showValue?: boolean;
  format?: "percent" | "decimal" | "scientific";
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    blue: "bg-sky-500",
    green: "bg-emerald-500",
    red: "bg-rose-500",
    amber: "bg-amber-500",
    purple: "bg-violet-500",
    slate: "bg-slate-400",
    pink: "bg-pink-500",
  };

  const formatValue = () => {
    switch (format) {
      case "percent":
        return `${(value * 100).toFixed(2)}%`;
      case "scientific":
        return value.toExponential(2);
      default:
        return value.toFixed(4);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {showValue && (
        <span className="text-sm font-mono text-slate-700 tabular-nums min-w-[72px]">
          {formatValue()}
        </span>
      )}
      <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/** Mono text cell for IDs, coordinates, variant IDs */
export function DataTableMono({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-data",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Sparkline mini chart for inline data visualization */
export function DataTableSparkline({
  data,
  color = "blue",
  height = 24,
  width = 60,
}: {
  data: number[];
  color?: "blue" | "green" | "red" | "amber" | "purple";
  height?: number;
  width?: number;
}) {
  if (!data || data.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const colors = {
    blue: "stroke-blue-500",
    green: "stroke-emerald-500",
    red: "stroke-red-500",
    amber: "stroke-amber-500",
    purple: "stroke-purple-500",
  };

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        className={cn("stroke-[1.5]", colors[color])}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Link cell with external icon */
export function DataTableLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-base font-medium text-purple-600 hover:text-purple-700 hover:underline transition-colors inline-flex items-center gap-1"
    >
      {children}
      {external && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  );
}

/** Multi-value cell for displaying arrays */
export function DataTableMultiValue({
  values,
  max = 3,
}: {
  values: string[] | null | undefined;
  max?: number;
}) {
  if (!values || values.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const displayed = values.slice(0, max);
  const remaining = values.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((val, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-caption"
        >
          {val}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-caption">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

/** Header with tooltip for column descriptions */
export function DataTableColumnHeader({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  if (!tooltip) return <>{children}</>;

  return (
    <div className="flex items-center gap-1.5">
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-slate-400 hover:text-slate-600 cursor-help transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** @deprecated Use DataTableColumnHeader instead */
export const DataTableHeader = DataTableColumnHeader;

/** Boolean/Status cell */
export function DataTableStatus({
  value,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  return value ? (
    <span className="inline-flex items-center gap-1.5 text-base text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-base text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      {falseLabel}
    </span>
  );
}

/** Gene symbol cell with link */
export function DataTableGene({
  symbol,
  href,
}: {
  symbol: string;
  href?: string;
}) {
  const content = (
    <span className="text-base font-semibold text-slate-900">{symbol}</span>
  );

  if (href) {
    return (
      <a
        href={href}
        className="hover:text-purple-600 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return content;
}
