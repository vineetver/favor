"use client";

/**
 * Horizontal stacked bar chart — Plotly-based.
 * Each trace is one segment of the stack (e.g. SNV vs Indel).
 * Data-first: pass labels + typed traces, chart handles the rest.
 */

import { Plot } from "./plotly-chart";
import { PLOTLY_CONFIG_STATIC, PLOTLY_FONT, PLOTLY_AXIS } from "./theme";

export interface StackedHBarTrace {
  name: string;
  values: number[];
  color: string;
}

interface StackedHBarProps {
  /** Category labels on the Y axis */
  labels: string[];
  /** Each trace is one segment of the stack */
  traces: StackedHBarTrace[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function StackedHBar({
  labels,
  traces,
  title,
  subtitle,
  className,
}: StackedHBarProps) {
  // Filter to only labels where at least one trace has a non-zero value
  const keep = labels.map((_, i) =>
    traces.some((t) => (t.values[i] ?? 0) > 0),
  );
  const filteredLabels = labels.filter((_, i) => keep[i]);
  if (filteredLabels.length === 0) return null;

  // Reverse for bottom-to-top Plotly Y-axis ordering
  const yLabels = [...filteredLabels].reverse();

  const data = traces.map((trace) => ({
    type: "bar" as const,
    orientation: "h" as const,
    y: yLabels,
    x: trace.values
      .filter((_, i) => keep[i])
      .reverse(),
    name: trace.name,
    marker: { color: trace.color },
    hovertemplate: "%{y}: %{x:,}<extra>" + trace.name + "</extra>",
  }));

  const titleText = subtitle
    ? `<b>${title}</b><br><span style="font-size:11px;color:#737373">${subtitle}</span>`
    : title
      ? `<b>${title}</b>`
      : undefined;

  return (
    <div className={className}>
      <Plot
        data={data}
        layout={{
          font: PLOTLY_FONT,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          barmode: "stack",
          bargap: 0.25,
          title: titleText
            ? { text: titleText, font: { size: 13 }, x: 0.01, xanchor: "left" }
            : undefined,
          height: Math.max(180, filteredLabels.length * 36 + 80),
          margin: { l: 140, r: 20, t: title ? 55 : 15, b: 35 },
          xaxis: {
            ...PLOTLY_AXIS,
            showline: false,
            gridcolor: "#f0f0f0",
            tickfont: { size: 10 },
          },
          yaxis: {
            ...PLOTLY_AXIS,
            showline: false,
            showgrid: false,
            automargin: true,
            tickfont: { size: 11 },
          },
          legend: {
            orientation: "h",
            y: -0.15,
            x: 0.5,
            xanchor: "center",
            font: { size: 11 },
          },
          showlegend: traces.length > 1,
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    </div>
  );
}
