"use client";

import { cn } from "@infra/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Check, ChevronDown, ShieldAlert, Star } from "lucide-react";
import { useDistribution } from "../../hooks/use-distribution";
import { useMaveUrlState } from "../../hooks/use-mave-url-state";
import { strengthLabel } from "../../lib/parse";
import type { Calibration, DistributionView } from "../../types";
import { HistogramChart } from "./histogram-chart";

interface ChartCardProps {
  urn: string;
  calibrationsByTitle: Record<string, Calibration[]>;
  activeCalibration: string | null;
  onActiveCalibrationChange: (title: string) => void;
  view: DistributionView;
}

export function ChartCard({
  urn,
  calibrationsByTitle,
  activeCalibration,
  onActiveCalibrationChange,
  view,
}: ChartCardProps) {
  const calibrationTitles = Object.keys(calibrationsByTitle);
  const { payload, isLoading, isFetching, error } = useDistribution({
    urn,
    calibrationTitle: activeCalibration,
    view,
    enabled: true,
  });

  // 404 = "no scoreable variants" — the card has nothing useful to say.
  if (!isLoading && !error && payload === null) return null;

  const hasBands = payload && payload.calibration_bands.length > 0;
  const refetching = isFetching && !!payload;

  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        {calibrationTitles.length > 0 ? (
          <CalibrationPicker
            titles={calibrationTitles}
            calibrationsByTitle={calibrationsByTitle}
            active={activeCalibration}
            onChange={onActiveCalibrationChange}
          />
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Score distribution
          </span>
        )}
      </header>

      <div className="px-4 py-4">
        {isLoading && !payload && <ChartSkeleton />}

        {error && (
          <p className="py-2 text-sm text-destructive">
            {(error as Error)?.message ?? "Failed to load distribution."}
          </p>
        )}

        {payload && (
          <div
            className={cn(
              "space-y-3 transition-opacity duration-150",
              refetching && "opacity-60",
            )}
          >
            <HistogramChart
              bins={payload.bins}
              bands={payload.calibration_bands}
            />
            {hasBands ? (
              <BandLegend
                bands={payload.calibration_bands}
                totalVariants={payload.total}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>No ACMG calibration published — score axis only.</span>
                <span className="tabular-nums">
                  {payload.total.toLocaleString()} scored
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading distribution"
    >
      <Skeleton className="h-[280px] w-full rounded" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

interface CalibrationPickerProps {
  titles: string[];
  calibrationsByTitle: Record<string, Calibration[]>;
  active: string | null;
  onChange: (title: string) => void;
}

/**
 * IGVF Coding Variant Focus Group "All Variants" controls is the
 * community-recognised reference. When present it's THE primary (singular),
 * even if the publisher flagged something else.
 */
function isIgvfAllVariants(title: string): boolean {
  return /\bigvf\b/i.test(title) && /all\s+variants/i.test(title);
}

/**
 * Pick exactly one calibration as primary. Priority:
 *   1. IGVF "All Variants" (the community reference).
 *   2. First publisher-flagged is_primary.
 *   3. None.
 */
function resolvePrimaryTitle(
  titles: string[],
  calibrationsByTitle: Record<string, Calibration[]>,
): string | null {
  const igvf = titles.find(isIgvfAllVariants);
  if (igvf) return igvf;
  const flagged = titles.find((t) =>
    calibrationsByTitle[t]?.some((b) => b.is_primary),
  );
  return flagged ?? null;
}

function CalibrationPicker({
  titles,
  calibrationsByTitle,
  active,
  onChange,
}: CalibrationPickerProps) {
  const primaryTitle = resolvePrimaryTitle(titles, calibrationsByTitle);
  const isRuo = (title: string) =>
    calibrationsByTitle[title]?.some((b) => b.research_use_only) ?? false;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-foreground/30 transition-colors max-w-full"
        >
          <span className="text-muted-foreground shrink-0">
            Active calibration
          </span>
          <span className="font-medium truncate min-w-0">
            {active ?? "Select"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] p-1">
        <ul className="space-y-0.5">
          {titles.map((title) => {
            const isActive = title === active;
            return (
              <li key={title}>
                <button
                  type="button"
                  onClick={() => onChange(title)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/5"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <span className="flex-1 min-w-0 leading-snug">{title}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {title === primaryTitle && <PrimaryBadge />}
                    {isRuo(title) && <RuoBadge />}
                    <span className="w-4">
                      {isActive && <Check className="h-4 w-4 text-primary" />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function PrimaryBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
      <Star className="h-2.5 w-2.5" />
      Primary
    </span>
  );
}

function RuoBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">
      <ShieldAlert className="h-2.5 w-2.5" />
      RUO
    </span>
  );
}

const LEGEND_LABEL_CLASS: Record<string, string> = {
  LOF: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  GoF: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  Functional: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  Intermediate:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};

function bandMatches(
  band: Calibration,
  smin: number | null,
  smax: number | null,
): boolean {
  return (
    (band.range_low ?? null) === smin && (band.range_high ?? null) === smax
  );
}

function BandLegend({
  bands,
  totalVariants,
}: {
  bands: Calibration[];
  totalVariants: number;
}) {
  const { state, set } = useMaveUrlState();

  if (bands.length === 0) return null;

  const filterActive = state.smin != null || state.smax != null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ul className="flex flex-wrap gap-1.5 text-[11px]">
        {bands.map((b, i) => {
          const isActive = bandMatches(b, state.smin, state.smax);
          return (
            <li key={`${b.calibration_idx}-${b.display_label}-${i}`}>
              <button
                type="button"
                onClick={() =>
                  set(
                    isActive
                      ? { smin: null, smax: null }
                      : { smin: b.range_low, smax: b.range_high },
                  )
                }
                aria-pressed={isActive}
                title={`Filter variants table to ${b.display_label}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition-shadow",
                  b.label_class
                    ? LEGEND_LABEL_CLASS[b.label_class]
                    : "bg-muted text-muted-foreground border-border",
                  isActive
                    ? "ring-2 ring-offset-1 ring-offset-background ring-current shadow-sm"
                    : "hover:shadow-sm",
                )}
              >
                <span className="font-semibold">{b.display_label}</span>
                <span className="opacity-80">
                  · {strengthLabel(b.evidence_strength)}
                </span>
                <span className="tabular-nums opacity-80">
                  · {b.variant_count.toLocaleString()}
                </span>
              </button>
            </li>
          );
        })}
        {filterActive && (
          <li>
            <button
              type="button"
              onClick={() => set({ smin: null, smax: null })}
              title="Clear score filter"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <span aria-hidden>×</span>
              Clear filter
            </button>
          </li>
        )}
      </ul>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {totalVariants.toLocaleString()} scored
      </p>
    </div>
  );
}
