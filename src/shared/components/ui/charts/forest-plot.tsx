"use client";

/**
 * Forest plot — horizontal OR (or any effect size) + 95% CI.
 * Reusable: pass methods, point estimates, and CI bounds.
 */

import { Plot } from "./plotly-chart";
import { PLOTLY_AXIS, PLOTLY_CONFIG_STATIC, PLOTLY_FONT } from "./theme";

export interface ForestPlotRow {
  label: string;
  estimate: number;
  lo: number;
  hi: number;
}

interface ForestPlotProps {
  data: ForestPlotRow[];
  title?: string;
  xLabel?: string;
  refLine?: number | null;
  logX?: boolean;
  className?: string;
}

export function ForestPlot({
  data,
  title,
  xLabel = "Odds Ratio (95% CI)",
  refLine = 1,
  logX = true,
  className,
}: ForestPlotProps) {
  const labels = [...data].reverse().map((d) => d.label);
  const estimates = [...data].reverse().map((d) => d.estimate);
  const errLo = [...data].reverse().map((d) => d.estimate - d.lo);
  const errHi = [...data].reverse().map((d) => d.hi - d.estimate);

  return (
    <div className={className}>
      <Plot
        data={[
          {
            type: "scatter" as const,
            x: estimates,
            y: labels,
            mode: "markers" as const,
            marker: { color: "#171717", size: 8 },
            error_x: {
              type: "data" as const,
              symmetric: false,
              array: errHi,
              arrayminus: errLo,
              color: "#171717",
              thickness: 1.5,
              width: 6,
            },
            hovertemplate: "%{y}: %{x:.2f}<extra></extra>",
          },
        ]}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          title: title
            ? { text: `<b>${title}</b>`, font: { size: 14 } }
            : undefined,
          height: Math.max(200, data.length * 50 + 100),
          margin: { l: 120, r: 30, t: title ? 50 : 20, b: 50 },
          xaxis: {
            ...PLOTLY_AXIS,
            title: { text: xLabel, font: { size: 12 } },
            type: logX ? "log" : "linear",
            ...(logX ? { dtick: 1 } : {}),
          },
          yaxis: { ...PLOTLY_AXIS, automargin: true, tickfont: { size: 13 } },
          shapes:
            refLine != null
              ? [
                  {
                    type: "line" as const,
                    x0: refLine,
                    x1: refLine,
                    y0: -0.5,
                    y1: data.length - 0.5,
                    yref: "y" as const,
                    line: { color: "#dc2626", width: 2, dash: "dash" as const },
                  },
                ]
              : [],
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    </div>
  );
}
