"use client";

import { useMemo } from "react";
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
import { cn } from "@/infrastructure/utils";
import { ChartLegend } from "./ChartLegend";
import { BarChartTooltip } from "./ChartTooltip";
import { DEFAULT_BAR_COLOR, getLegendItems, getRowColor } from "./colors";
import type { BarChartProps } from "./types";

/** Internal chart data format */
interface ChartRow {
  id: string;
  label: string;
  value: number;
  derived: number | null;
  category?: string;
  color: string;
}

/**
 * Configurable bar chart component.
 * Supports horizontal/vertical layout, gradient and categorical coloring.
 */
export function BarChart({
  data,
  colorScheme = { type: "single", color: DEFAULT_BAR_COLOR },
  colorField = "derived",
  layout = "horizontal",
  showLegend = true,
  excludeIds = [],
  valueFormatter = (v) => v.toFixed(3),
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

  // Calculate responsive height
  const chartHeight = useMemo(() => {
    if (layout === "horizontal") {
      // Horizontal bars need more height for more rows
      return Math.max(400, chartData.length * 38);
    }
    return 400;
  }, [layout, chartData.length]);

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
                tickFormatter={(value) => valueFormatter(value)}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={160}
                tick={{ fontSize: 12, fill: "#334155" }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey="label"
                tick={({ x, y, payload }) => (
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
                )}
                height={80}
              />
              <YAxis
                type="number"
                domain={[0, "auto"]}
                tickFormatter={(value) => valueFormatter(value)}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
            </>
          )}

          <Tooltip
            content={({ active, payload }) => (
              <BarChartTooltip
                active={active}
                payload={payload as Array<{ payload: ChartRow }>}
                valueFormatter={valueFormatter}
              />
            )}
          />

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
}
