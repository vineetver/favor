"use client";

import { useMemo } from "react";
import { Plot } from "./plotly-chart";
import { PLOTLY_FONT, PLOTLY_AXIS, PLOTLY_CONFIG_STATIC, METHOD_PALETTE } from "./theme";

export interface PRCurvePoint {
  method: string;
  threshold: number;
  precision: number;
  recall: number;
}

interface PRCurveProps {
  data: PRCurvePoint[];
  title?: string;
  className?: string;
}

export function PRCurve({ data, title, className }: PRCurveProps) {
  const traces = useMemo(() => {
    const byMethod = new Map<string, PRCurvePoint[]>();
    for (const pt of data) {
      const arr = byMethod.get(pt.method) ?? [];
      arr.push(pt);
      byMethod.set(pt.method, arr);
    }

    return Array.from(byMethod.entries()).map(([method, pts]) => {
      // Sort by recall ascending for a clean line
      pts.sort((a, b) => a.recall - b.recall);
      return {
        x: pts.map((p) => p.recall),
        y: pts.map((p) => p.precision),
        type: "scatter" as const,
        mode: "lines" as const,
        name: method,
        line: {
          color: METHOD_PALETTE[method] ?? "#737373",
          width: 2,
        },
        hovertemplate: `${method}<br>Recall: %{x:.2f}<br>Precision: %{y:.2f}<extra></extra>`,
        hoverlabel: { namelength: -1 },
      };
    });
  }, [data]);

  return (
    <div className={className}>
      <Plot
        data={traces}
        layout={{
          title: title ? { text: title, font: { ...PLOTLY_FONT, size: 14 }, x: 0, xanchor: "left" } : undefined,
          font: PLOTLY_FONT,
          xaxis: { ...PLOTLY_AXIS, title: { text: "Recall" }, range: [0, 1.02] },
          yaxis: { ...PLOTLY_AXIS, title: { text: "Precision" }, range: [0, 1.05] },
          height: 400,
          margin: { l: 60, r: 120, t: title ? 50 : 20, b: 50 },
          legend: { x: 1.02, y: 1, xanchor: "left" as const, font: { size: 11 } },
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          showlegend: true,
        }}
        config={PLOTLY_CONFIG_STATIC}
        style={{ width: "100%" }}
      />
    </div>
  );
}
