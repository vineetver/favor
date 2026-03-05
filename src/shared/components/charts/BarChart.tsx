"use client";

import { cn } from "@infra/utils";
import { memo, useCallback, useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartLegend } from "./ChartLegend";
import { BarChartTooltip } from "./ChartTooltip";
import { DEFAULT_BAR_COLOR, getLegendItems, getRowColor } from "./colors";
import type { BarChartProps, ColorScheme } from "./types";

/** Internal chart data format */
interface ChartRow {
  id: string;
  label: string;
  value: number;
  derived: number | null;
  category?: string;
  color: string;
}

// Stable default references — avoids new objects on every render that break useMemo deps
const DEFAULT_COLOR_SCHEME: ColorScheme = { type: "single", color: DEFAULT_BAR_COLOR };
const DEFAULT_EXCLUDE_IDS: string[] = [];
const DEFAULT_VALUE_FORMATTER = (v: number) => v.toFixed(3);

function BarChartTooltipContent({
  active,
  payload,
  valueFormatter: fmt,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  valueFormatter: (v: number) => string;
}) {
  return <BarChartTooltip active={active} payload={payload} valueFormatter={fmt} />;
}

// Stable rotated tick component — avoids inline function in XAxis tick prop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RotatedTick({ x, y, payload }: any) {
  return (
    <text
      x={x}
      y={y}
      dy={8}
      fontSize={11}
      fill="#64748b"
      textAnchor="end"
      transform={`rotate(-45, ${x}, ${y})`}
    >
      {payload.value}
    </text>
  );
}

/**
 * Configurable bar chart component.
 * Supports horizontal/vertical layout, gradient and categorical coloring.
 */
export const BarChart = memo(function BarChart({
  data,
  colorScheme = DEFAULT_COLOR_SCHEME,
  colorField = "derived",
  layout = "horizontal",
  showLegend = true,
  excludeIds = DEFAULT_EXCLUDE_IDS,
  valueFormatter = DEFAULT_VALUE_FORMATTER,
  emptyMessage = "No data available for visualization",
  className,
}: BarChartProps) {
  // Transform and filter data
  const chartData = useMemo<ChartRow[]>(() => {
    return data
      .filter((row) => {
        // Exclude specified IDs
        if (excludeIds.includes(row.id)) return false;
        // Exclude null/undefined values
        if (row.value === null || row.value === undefined) return false;
        return true;
      })
      .map((row) => ({
        id: row.id,
        label: row.label,
        value:
          typeof row.value === "number"
            ? row.value
            : parseFloat(String(row.value)) || 0,
        derived:
          row.derived !== null && row.derived !== undefined
            ? typeof row.derived === "number"
              ? row.derived
              : parseFloat(String(row.derived)) || null
            : null,
        category: row.category,
        color: getRowColor(
          {
            value: typeof row.value === "number" ? row.value : null,
            derived:
              row.derived !== null && row.derived !== undefined
                ? typeof row.derived === "number"
                  ? row.derived
                  : parseFloat(String(row.derived)) || null
                : null,
            category: row.category,
          },
          colorScheme,
          colorField,
        ),
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [data, colorScheme, colorField, excludeIds]);

  // Generate legend items
  const legendItems = useMemo(() => {
    if (!showLegend) return [];
    return getLegendItems(colorScheme);
  }, [showLegend, colorScheme]);

  // Calculate responsive height — capped to prevent overflow
  const chartHeight = useMemo(() => {
    if (layout === "horizontal") {
      return Math.min(600, Math.max(300, chartData.length * 38));
    }
    return 400;
  }, [layout, chartData.length]);

  // Auto-compute YAxis width for horizontal bars based on longest label
  const yAxisWidth = useMemo(() => {
    if (layout !== "horizontal" || chartData.length === 0) return 160;
    const maxLen = Math.max(...chartData.map((d) => d.label.length));
    // ~7px per char at fontSize 12, clamped to [100, 240]
    return Math.min(240, Math.max(100, maxLen * 7 + 16));
  }, [layout, chartData]);

  // Stable tooltip content — avoids inline closure that creates new reference on every render
  const tooltipContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ active, payload }: any) => (
      <BarChartTooltipContent
        active={active}
        payload={payload as Array<{ payload: ChartRow }>}
        valueFormatter={valueFormatter}
      />
    ),
    [valueFormatter],
  );

  // Empty state
  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-64 text-slate-400",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const isHorizontal = layout === "horizontal";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Legend */}
      {legendItems.length > 0 && (
        <ChartLegend
          items={legendItems}
          title={colorScheme.type === "gradient" ? "Percentile:" : undefined}
        />
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsBarChart
          data={chartData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={isHorizontal}
            vertical={!isHorizontal}
            stroke="#e2e8f0"
          />

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                domain={[0, "auto"]}
                tickFormatter={valueFormatter}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fontSize: 12, fill: "#334155" }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey="label"
                tick={RotatedTick}
                height={80}
              />
              <YAxis
                type="number"
                domain={[0, "auto"]}
                tickFormatter={valueFormatter}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
            </>
          )}

          <Tooltip content={tooltipContent} />

          <Bar
            dataKey="value"
            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            barSize={20}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});
