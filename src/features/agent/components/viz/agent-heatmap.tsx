"use client";

import { memo, useMemo } from "react";
import type { HeatmapVizSpec } from "../../viz/types";

/** Interpolate between two hex colors */
function interpolateColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function getColor(
  value: number,
  min: number,
  max: number,
  scale: "diverging" | "sequential",
): string {
  if (max === min) return "#94a3b8";
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  if (scale === "diverging") {
    // Blue → White → Red
    if (t < 0.5) return interpolateColor("#3b82f6", "#f1f5f9", t * 2);
    return interpolateColor("#f1f5f9", "#ef4444", (t - 0.5) * 2);
  }

  // Sequential: Light → Violet
  return interpolateColor("#ede9fe", "#7c3aed", t);
}

export const AgentHeatmap = memo(function AgentHeatmap({
  spec,
}: {
  spec: HeatmapVizSpec;
}) {
  const { min, max } = useMemo(() => {
    if (spec.minValue != null && spec.maxValue != null) {
      return { min: spec.minValue, max: spec.maxValue };
    }
    let mn = Infinity;
    let mx = -Infinity;
    for (const row of spec.values) {
      for (const v of row) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }
    return { min: mn === Infinity ? 0 : mn, max: mx === -Infinity ? 1 : mx };
  }, [spec.values, spec.minValue, spec.maxValue]);

  const cellSize = spec.rows.length > 20 || spec.cols.length > 20 ? 16 : 28;
  const labelWidth = 100;

  return (
    <div className="w-full overflow-x-auto">
      {spec.valueLabel && (
        <p className="text-[11px] text-muted-foreground mb-1.5">{spec.valueLabel}</p>
      )}
      <div className="inline-block">
        {/* Column headers */}
        <div className="flex" style={{ marginLeft: labelWidth }}>
          {spec.cols.map((col) => (
            <div
              key={col}
              className="text-[10px] text-muted-foreground truncate text-center"
              style={{ width: cellSize, minWidth: cellSize }}
              title={col}
            >
              {col.length > 4 ? col.slice(0, 3) + "\u2026" : col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {spec.rows.map((row, ri) => (
          <div key={row} className="flex items-center">
            <div
              className="text-[10px] text-muted-foreground truncate text-right pr-1.5"
              style={{ width: labelWidth, minWidth: labelWidth }}
              title={row}
            >
              {row}
            </div>
            {spec.values[ri]?.map((val, ci) => (
              <div
                key={ci}
                className="border border-background"
                style={{
                  width: cellSize,
                  height: cellSize,
                  minWidth: cellSize,
                  backgroundColor: getColor(val, min, max, spec.colorScale),
                }}
                title={`${row} x ${spec.cols[ci]}: ${val.toFixed(3)}`}
              />
            ))}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-2" style={{ marginLeft: labelWidth }}>
          <span className="text-[10px] text-muted-foreground">{min.toFixed(2)}</span>
          <div
            className="h-3 rounded-sm"
            style={{
              width: 80,
              background:
                spec.colorScale === "diverging"
                  ? "linear-gradient(to right, #3b82f6, #f1f5f9, #ef4444)"
                  : "linear-gradient(to right, #ede9fe, #7c3aed)",
            }}
          />
          <span className="text-[10px] text-muted-foreground">{max.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});
