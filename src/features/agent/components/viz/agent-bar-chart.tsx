"use client";

import { memo, useCallback, useMemo } from "react";
import { BarChart } from "@shared/components/charts";
import type { ChartDataRow, ColorScheme } from "@shared/components/charts";
import { NODE_TYPE_COLORS } from "@features/graph/config/styling";
import type { BarChartVizSpec } from "../../viz/types";

/** Build a categorical color map from entity types present in data */
function buildColorScheme(
  data: BarChartVizSpec["data"],
): ColorScheme {
  const types = new Set(data.map((d) => d.category).filter(Boolean) as string[]);
  if (types.size < 2) return { type: "single", color: "#8b5cf6" };

  const colors: Record<string, string> = {};
  for (const t of types) {
    const nodeColor = NODE_TYPE_COLORS[t as keyof typeof NODE_TYPE_COLORS];
    colors[t] = nodeColor?.border ?? "#8b5cf6";
  }
  return { type: "categorical", colors };
}

export const AgentBarChart = memo(function AgentBarChart({ spec }: { spec: BarChartVizSpec }) {
  const chartData = useMemo<ChartDataRow[]>(
    () =>
      spec.data.map((d) => ({
        id: d.id,
        label: d.label,
        value: d.value,
        category: d.category,
      })),
    [spec.data],
  );

  const colorScheme = useMemo(() => buildColorScheme(spec.data), [spec.data]);

  const valueFormatter = useCallback(
    (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString() : v.toFixed(2)),
    [],
  );

  return (
    <BarChart
      data={chartData}
      layout={spec.layout}
      colorScheme={colorScheme}
      colorField="category"
      showLegend={colorScheme.type === "categorical"}
      valueFormatter={valueFormatter}
    />
  );
});
