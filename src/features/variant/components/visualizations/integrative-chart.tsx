"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { VisualizationProps } from "@/lib/table/column-builder";
import { ChartTooltip } from "@/components/common/chart-tooltip";

/**
 * Get color based on percentile significance.
 * Lower percentile = more significant = warmer color
 */
function getPercentileColor(percentile: number | null): string {
  if (percentile === null) return "#94a3b8"; // gray
  if (percentile < 1) return "#dc2626"; // red-600
  if (percentile < 5) return "#ea580c"; // orange-600
  if (percentile < 10) return "#f59e0b"; // amber-500
  if (percentile < 25) return "#eab308"; // yellow-500
  if (percentile < 50) return "#84cc16"; // lime-500
  return "#22c55e"; // green-500
}

/**
 * Custom tooltip for the bar chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; derived: number | null } }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const percentile = data.derived;

  return (
    <ChartTooltip active={active} payload={payload}>
      <div className="space-y-1">
        <div className="font-medium">{data.label}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Score:</span>
          <span className="font-mono">{data.value?.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Percentile:</span>
          <span className="font-mono">
            {percentile !== null ? `${Math.min(percentile, 100).toFixed(2)}%` : "—"}
          </span>
        </div>
      </div>
    </ChartTooltip>
  );
}

/**
 * Bar chart visualization for integrative scores.
 * Bars are colored by percentile significance.
 */
export function IntegrativeBarChart({ data }: VisualizationProps) {
  // Transform data for Recharts
  const chartData = data
    .filter((row) => row.value !== null && row.value !== undefined)
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: typeof row.value === "number" ? row.value : parseFloat(String(row.value)) || 0,
      derived: row.derived as number | null,
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for visualization
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-caption">
        <span>Percentile:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#dc2626" }} />
          <span>&lt;1%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ea580c" }} />
          <span>1-5%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#f59e0b" }} />
          <span>5-10%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#eab308" }} />
          <span>10-25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#84cc16" }} />
          <span>25-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }} />
          <span>&gt;50%</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 38)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={160}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={getPercentileColor(entry.derived)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
