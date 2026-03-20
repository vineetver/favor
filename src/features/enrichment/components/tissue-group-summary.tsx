"use client";

import { cn } from "@infra/utils";
import type { TissueGroupRow } from "@features/enrichment/api/region";
import { formatCount, formatTissueName } from "@shared/utils/tissue-format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { updateClientUrl } from "@shared/hooks";
import { ChevronRight } from "lucide-react";
import { useCallback } from "react";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TissueGroupMetricConfig {
  /** Label shown above the metric bar (e.g., "Max Z-score") */
  metricLabel: string;
  /** Tooltip explaining the metric */
  metricDescription: string;
  /** Label for the count column */
  countLabel: string;
  /** Format the metric value for display */
  formatMetric: (v: number) => string;
  /** Max value for the relative bar width (data-driven if omitted) */
  metricCeiling?: number;
  /** Show the significant column */
  showSignificant?: boolean;
  /** Show the top item column */
  showTopItem?: boolean;
  /** Label for the top item (e.g., "Top cCRE", "Top Gene") */
  topItemLabel?: string;
  /** Hide the metric bar entirely (for views where max_value isn't meaningful) */
  hideMetric?: boolean;
  /** Use sqrt scaling for metric bar (handles skewed distributions like -log10p) */
  sqrtScale?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TissueGroupSummaryProps {
  data: TissueGroupRow[];
  metricConfig: TissueGroupMetricConfig;
  subtitle?: string;
}

export function TissueGroupSummary({
  data,
  metricConfig: cfg,
  subtitle,
}: TissueGroupSummaryProps) {
  const handleClick = useCallback((tissueName: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("tissue_group", tissueName);
    params.delete("cursor");
    updateClientUrl(`${window.location.pathname}?${params}`, true);
  }, []);

  const rawMaxMetric = cfg.metricCeiling ?? Math.max(...data.map((r) => r.max_value), 1);
  const maxMetric = cfg.sqrtScale ? Math.sqrt(rawMaxMetric) : rawMaxMetric;
  const maxCount = Math.max(...data.map((r) => r.count), 1);
  const scaleMetric = (v: number) => (cfg.sqrtScale ? Math.sqrt(v) : v) / maxMetric;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">
            {subtitle ?? `${data.length} tissue groups`}
          </p>
        </div>

        {/* Column labels */}
        <div className="grid items-center gap-3 px-5 py-2 border-b border-border text-xs text-muted-foreground"
          style={{ gridTemplateColumns: columnTemplate(cfg) }}>
          <span>Tissue Group</span>
          {!cfg.hideMetric && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{cfg.metricLabel}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {cfg.metricDescription}
              </TooltipContent>
            </Tooltip>
          )}
          <span className="text-right">{cfg.countLabel}</span>
          {cfg.showSignificant && <span className="text-right">Significant</span>}
          {cfg.showTopItem && <span>{cfg.topItemLabel ?? "Top Item"}</span>}
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {data.map((row) => (
            <button
              key={row.tissue_name}
              type="button"
              onClick={() => handleClick(row.tissue_name)}
              className="grid items-center gap-3 px-5 py-3 w-full text-left transition-colors hover:bg-accent group"
              style={{ gridTemplateColumns: columnTemplate(cfg) }}
            >
              {/* Tissue name */}
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {formatTissueName(row.tissue_name)}
              </span>

              {/* Metric bar */}
              {!cfg.hideMetric && (
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-primary/10 overflow-hidden max-w-[100px]">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.max(scaleMetric(row.max_value) * 100, 2)}%`,
                        opacity: Math.max(0.25, Math.min(scaleMetric(row.max_value), 0.85)),
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground min-w-[48px]">
                    {cfg.formatMetric(row.max_value)}
                  </span>
                </div>
              )}

              {/* Count */}
              <div className="flex items-center justify-end gap-2">
                <div className="h-1 rounded-full bg-muted overflow-hidden w-12">
                  <div
                    className="h-full rounded-full bg-foreground/20"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-foreground font-medium min-w-[40px] text-right">
                  {formatCount(row.count)}
                </span>
              </div>

              {/* Significant */}
              {cfg.showSignificant && (
                <span className={cn(
                  "text-xs tabular-nums text-right",
                  (row.significant ?? 0) > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground/40",
                )}>
                  {row.significant != null ? row.significant.toLocaleString() : "\u2014"}
                </span>
              )}

              {/* Top item */}
              {cfg.showTopItem && (
                <span className="text-xs text-muted-foreground truncate">
                  {row.top_item || "\u2014"}
                </span>
              )}

              {/* Arrow */}
              <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors ml-auto" />
            </button>
          ))}
        </div>

        {data.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No tissue-level data available
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function columnTemplate(cfg: TissueGroupMetricConfig): string {
  const parts = ["minmax(120px, 1fr)"];
  if (!cfg.hideMetric) parts.push("minmax(140px, 180px)");
  parts.push("minmax(80px, 100px)");
  if (cfg.showSignificant) parts.push("80px");
  if (cfg.showTopItem) parts.push("minmax(80px, 140px)");
  parts.push("24px");
  return parts.join(" ");
}
