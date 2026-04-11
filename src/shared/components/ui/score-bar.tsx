"use client";

interface ScoreBarProps {
  /** Numeric value to display. Null renders "—". */
  value: number | null;
  /** Maximum scale value (default: 1 for 0–1 scores). */
  max?: number;
  /** Width class for the bar track. Default: "w-12". */
  trackWidth?: string;
  /** Number of decimal places. Default: 2. */
  decimals?: number;
}

function format(value: number | null, decimals: number) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

/** Compact inline bar + number for proportional scores. */
export function ScoreBar({
  value,
  max = 1,
  trackWidth = "w-12",
  decimals = 2,
}: ScoreBarProps) {
  const n = typeof value === "number" ? value : 0;
  const percent = Math.round((Math.max(0, Math.min(max, n)) / max) * 100);

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground w-7 text-right">
        {format(value, decimals)}
      </span>
      <div
        className={`h-1 ${trackWidth} rounded-full bg-border overflow-hidden`}
      >
        <div
          className="h-full rounded-full bg-foreground/25"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
