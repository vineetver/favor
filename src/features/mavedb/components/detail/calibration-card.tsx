"use client";

import { cn } from "@infra/utils";
import { Pin, PinOff, ShieldAlert, Star } from "lucide-react";
import { LABEL_CLASS_STYLE } from "../../constants";
import { strengthLabel } from "../../lib/parse";
import type { Calibration } from "../../types";

interface CalibrationCardProps {
  title: string;
  bands: Calibration[];
  active: boolean;
  onActivate: () => void;
  /** When true, hides the activate-pin button (e.g. only one calibration exists). */
  hideActivate?: boolean;
}

const CLASS_BAR_BG: Record<string, string> = {
  LOF: "bg-rose-500",
  GoF: "bg-emerald-500",
  Functional: "bg-sky-500",
  Intermediate: "bg-amber-500",
};

const CLASS_BAR_FALLBACK = "bg-muted-foreground/40";

function bandFillClass(band: Calibration): string {
  if (!band.label_class) return CLASS_BAR_FALLBACK;
  return CLASS_BAR_BG[band.label_class] ?? CLASS_BAR_FALLBACK;
}

function formatRange(b: Calibration): string {
  const lo = b.range_low;
  const hi = b.range_high;
  if (lo == null && hi == null) return "—";
  const loBracket = b.inclusive_lower ? "[" : "(";
  const hiBracket = b.inclusive_upper ? "]" : ")";
  const loText = lo == null ? "−∞" : lo.toFixed(2);
  const hiText = hi == null ? "∞" : hi.toFixed(2);
  return `${loBracket}${loText}, ${hiText}${hiBracket}`;
}

/**
 * Total inclusive width of a calibration's union of bands. Used to size
 * each band's segment in the color bar at the top of the card. Bands
 * with open-ended ranges contribute a clamped width.
 */
function bandWidths(bands: Calibration[]): number[] {
  const FALLBACK = 1;
  const lows = bands.map((b) => b.range_low ?? 0);
  const highs = bands.map((b) => b.range_high ?? 0);
  const min = Math.min(...lows, ...highs);
  const max = Math.max(...lows, ...highs);
  const span = Math.max(max - min, 1e-9);
  return bands.map((b) => {
    const lo = b.range_low ?? min - span * 0.15;
    const hi = b.range_high ?? max + span * 0.15;
    return Math.max(hi - lo, FALLBACK / bands.length);
  });
}

export function CalibrationCard({
  title,
  bands,
  active,
  onActivate,
  hideActivate,
}: CalibrationCardProps) {
  const baseline = bands.find((b) => b.baseline_score != null);
  const isPrimary = bands.some((b) => b.is_primary);
  const isRuo = bands.some((b) => b.research_use_only);
  const totalVariants = bands.reduce(
    (sum, b) => sum + (b.variant_count ?? 0),
    0,
  );
  const widths = bandWidths(bands);
  const widthSum = widths.reduce((a, b) => a + b, 0);

  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <header className="flex items-start gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {title}
            </h3>
            {isPrimary && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Star className="h-2.5 w-2.5" />
                Primary
              </span>
            )}
            {isRuo && (
              <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-2.5 w-2.5" />
                RUO
              </span>
            )}
          </div>
          {baseline?.baseline_score_description && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">
                baseline {baseline.baseline_score?.toFixed(2)}
              </span>{" "}
              · {baseline.baseline_score_description}
            </p>
          )}
        </div>
        {!hideActivate && (
          <button
            type="button"
            onClick={onActivate}
            aria-label={active ? "Active calibration" : "Use this calibration"}
            aria-pressed={active}
            className={cn(
              "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {active ? (
              <Pin className="h-3.5 w-3.5" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </header>

      {/* Color bar */}
      <div className="flex h-1.5 gap-px overflow-hidden">
        {bands.map((b, i) => (
          <div
            key={`${b.calibration_idx}-${i}`}
            className={bandFillClass(b)}
            style={{ flexGrow: widths[i] / widthSum, flexBasis: 0 }}
            title={b.display_label}
          />
        ))}
      </div>

      {/* Band table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Band</th>
              <th className="px-3 py-2 text-left font-semibold">Range</th>
              <th className="px-3 py-2 text-left font-semibold">Class</th>
              <th className="px-3 py-2 text-left font-semibold">Strength</th>
              <th className="px-3 py-2 text-right font-semibold">OddsPath</th>
              <th className="px-3 py-2 text-right font-semibold">Variants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bands.map((b, i) => (
              <tr key={`${b.calibration_idx}-${b.display_label}-${i}`}>
                <td className="px-3 py-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                      b.label_class
                        ? LABEL_CLASS_STYLE[b.label_class]
                        : "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {b.display_label}
                  </span>
                  {b.evidence_criterion && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {b.evidence_criterion}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5 font-mono tabular-nums text-foreground">
                  {formatRange(b)}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {b.classification ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {strengthLabel(b.evidence_strength)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                  {typeof b.oddspath_ratio === "number"
                    ? b.oddspath_ratio.toFixed(2)
                    : "—"}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-foreground">
                  {b.variant_count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td
                colSpan={5}
                className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground"
              >
                Total
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground font-semibold">
                {totalVariants.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}
