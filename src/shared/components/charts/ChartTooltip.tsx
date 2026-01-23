"use client";

import { cn } from "@infra/utils";
import { Card, CardContent } from "@shared/components/ui/card";
import type { ReactNode } from "react";

export interface TooltipPayloadEntry {
  name?: string;
  value?: number | string | null;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  children?: ReactNode;
  className?: string;
  title?: string;
}

/**
 * Base tooltip component for Recharts.
 * Use as wrapper for custom tooltip content.
 *
 * @example
 * <Tooltip content={({ active, payload }) => (
 *   <ChartTooltip active={active} payload={payload}>
 *     <div>Custom content</div>
 *   </ChartTooltip>
 * )} />
 */
export function ChartTooltip({
  active,
  payload,
  label,
  children,
  className,
  title,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border shadow-md bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <CardContent className="p-3 space-y-1">
        {(title || label) && (
          <p className="text-sm font-semibold mb-2">{title || label}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Pre-built tooltip for bar charts showing label, value, and optional derived value.
 */
export function BarChartTooltip({
  active,
  payload,
  valueFormatter = (v) => v.toFixed(3),
  derivedLabel = "Percentile",
  derivedFormatter = (v) => `${Math.min(v, 100).toFixed(2)}%`,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { label: string; value: number | null; derived?: number | null };
  }>;
  valueFormatter?: (value: number) => string;
  derivedLabel?: string;
  derivedFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <ChartTooltip active={active} payload={payload}>
      <div className="space-y-1">
        <div className="font-medium">{data.label}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono">
            {data.value !== null ? valueFormatter(data.value) : "—"}
          </span>
        </div>
        {data.derived !== null && data.derived !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{derivedLabel}:</span>
            <span className="font-mono">{derivedFormatter(data.derived)}</span>
          </div>
        )}
      </div>
    </ChartTooltip>
  );
}
