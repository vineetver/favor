"use client";

import { memo, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { ScatterPlotVizSpec } from "../../viz/types";

const POINT_COLOR = "#8b5cf6";
const LINE_COLOR = "#ef4444";

export const AgentScatterPlot = memo(function AgentScatterPlot({
  spec,
}: {
  spec: ScatterPlotVizSpec;
}) {
  // Build regression line data points if available
  const regressionData = useMemo(() => {
    if (!spec.regressionLine || spec.data.length < 2) return null;
    const { slope, intercept } = spec.regressionLine;
    const xs = spec.data.map((d) => d.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept },
    ];
  }, [spec.regressionLine, spec.data]);

  if (regressionData) {
    // Use ComposedChart for scatter + regression line overlay
    return (
      <div className="w-full">
        {spec.regressionLine && (
          <p className="text-[11px] text-muted-foreground mb-1">
            R² = {spec.regressionLine.r_squared.toFixed(4)}
          </p>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="x"
              type="number"
              name={spec.xLabel}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: spec.xLabel,
                position: "insideBottom",
                offset: -15,
                style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              name={spec.yLabel}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              label={{
                value: spec.yLabel,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Scatter data={spec.data} fill={POINT_COLOR} fillOpacity={0.6} r={3} />
            <Line
              data={regressionData}
              dataKey="y"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 3"
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="x"
          type="number"
          name={spec.xLabel}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          label={{
            value: spec.xLabel,
            position: "insideBottom",
            offset: -15,
            style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
          }}
        />
        <YAxis
          dataKey="y"
          type="number"
          name={spec.yLabel}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          label={{
            value: spec.yLabel,
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Scatter data={spec.data} fill={POINT_COLOR} fillOpacity={0.6} r={3} />
      </ScatterChart>
    </ResponsiveContainer>
  );
});
