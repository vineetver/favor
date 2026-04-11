"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QQPlotVizSpec } from "../../viz/types";

const POINT_COLOR = "#8b5cf6";

export const AgentQQPlot = memo(function AgentQQPlot({
  spec,
}: {
  spec: QQPlotVizSpec;
}) {
  const maxVal = useMemo(() => {
    const maxExpected = Math.max(...spec.data.map((d) => d.expected), 1);
    const maxObserved = Math.max(...spec.data.map((d) => d.observed), 1);
    return Math.max(maxExpected, maxObserved) * 1.05;
  }, [spec.data]);

  return (
    <div className="w-full">
      {spec.lambda != null && (
        <p className="text-[11px] text-muted-foreground mb-1">
          Genomic inflation factor (lambda) = {spec.lambda.toFixed(4)}
        </p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="expected"
            type="number"
            name="Expected -log10(p)"
            domain={[0, maxVal]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Expected -log10(p)",
              position: "insideBottom",
              offset: -15,
              style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <YAxis
            dataKey="observed"
            type="number"
            name="Observed -log10(p)"
            domain={[0, maxVal]}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            label={{
              value: "Observed -log10(p)",
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
            formatter={(value: number | undefined) =>
              value != null ? value.toFixed(3) : ""
            }
          />
          {/* y=x reference diagonal */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: maxVal, y: maxVal },
            ]}
            stroke="var(--muted-foreground)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
          />
          <Scatter
            data={spec.data}
            fill={POINT_COLOR}
            fillOpacity={0.6}
            r={3}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
