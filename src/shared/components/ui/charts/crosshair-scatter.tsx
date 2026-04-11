"use client";

/**
 * Crosshair scatter — each point has x+y error bars (CI on both axes).
 * Used for OR-vs-Precision, Recall-vs-Precision, etc.
 */

import { Plot } from "./plotly-chart";
import {
  METHOD_PALETTE,
  METHOD_SYMBOLS,
  PLOTLY_AXIS,
  PLOTLY_CONFIG_STATIC,
  PLOTLY_FONT,
} from "./theme";

export interface CrosshairPoint {
  label: string;
  x: number;
  xLo: number;
  xHi: number;
  y: number;
  yLo: number;
  yHi: number;
}

interface CrosshairScatterProps {
  data: CrosshairPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xRefLine?: number;
  className?: string;
}

export function CrosshairScatter({
  data,
  title,
  xLabel,
  yLabel,
  xRefLine,
  className,
}: CrosshairScatterProps) {
  const traces = data.map((d) => ({
    type: "scatter" as const,
    x: [d.x],
    y: [d.y],
    name: d.label,
    mode: "markers" as const,
    marker: {
      color: METHOD_PALETTE[d.label] ?? "#737373",
      symbol: METHOD_SYMBOLS[d.label] ?? "circle",
      size: 10,
      line: { width: 1.5, color: METHOD_PALETTE[d.label] ?? "#737373" },
    },
    error_x: {
      type: "data" as const,
      symmetric: false,
      array: [d.xHi - d.x],
      arrayminus: [d.x - d.xLo],
      color: METHOD_PALETTE[d.label] ?? "#737373",
      thickness: 1.5,
      width: 4,
    },
    error_y: {
      type: "data" as const,
      symmetric: false,
      array: [d.yHi - d.y],
      arrayminus: [d.y - d.yLo],
      color: METHOD_PALETTE[d.label] ?? "#737373",
      thickness: 1.5,
      width: 4,
    },
    hovertemplate: `${d.label}<br>${xLabel ?? "x"}: %{x:.3f}<br>${yLabel ?? "y"}: %{y:.3f}<extra></extra>`,
    hoverlabel: { namelength: -1 },
  }));

  const shapes =
    xRefLine != null
      ? [
          {
            type: "line" as const,
            x0: xRefLine,
            x1: xRefLine,
            y0: 0,
            y1: 1,
            yref: "paper" as const,
            line: { color: "#dc2626", width: 1.5, dash: "dash" as const },
          },
        ]
      : [];

  return (
    <div className={className}>
      <Plot
        data={traces}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          title: title
            ? { text: `<b>${title}</b>`, font: { size: 13 } }
            : undefined,
          height: 400,
          margin: { l: 60, r: 120, t: title ? 50 : 20, b: 55 },
          showlegend: true,
          legend: {
            x: 1.02,
            y: 1,
            xanchor: "left" as const,
            font: { size: 11 },
          },
          xaxis: {
            ...PLOTLY_AXIS,
            title: { text: xLabel, font: { size: 11 } },
          },
          yaxis: {
            ...PLOTLY_AXIS,
            title: { text: yLabel, font: { size: 11 } },
          },
          shapes,
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    </div>
  );
}
