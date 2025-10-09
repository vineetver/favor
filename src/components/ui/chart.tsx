"use client";

import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_THEME } from "@/components/ui/charts/utils";

type BarSeries = {
  type: "bar";
  dataKey: string;
  label?: string;
  color?: string;
  stack?: string;
};

type Series = BarSeries;

interface ChartProps {
  data: Array<Record<string, unknown>>;
  series: Series[];
  xAxis: string | { dataKey: string };
  yAxisLabel?: string;
  showYAxis?: boolean;
  barGap?: number;
  barCategoryGap?: string;
  height?: string | number;
  width?: string | number;
  title?: string;
  className?: string;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function Chart({
  data,
  series,
  xAxis,
  yAxisLabel,
  showYAxis = false,
  barGap,
  barCategoryGap,
  height = 300,
  width,
  title,
  className,
}: ChartProps) {
  const chartColors = useMemo(() => {
    return series.map((s, i) => s.color || CHART_COLORS[i % CHART_COLORS.length]);
  }, [series]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const seriesConfig = series.find((s) => s.dataKey === entry.dataKey);
          const displayLabel = seriesConfig?.label || entry.dataKey;

          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{displayLabel}:</span>
              <span className="font-mono font-medium">
                {typeof entry.value === "number"
                  ? entry.value.toLocaleString()
                  : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const barSeries = series.filter((s) => s.type === "bar") as BarSeries[];
  const xAxisKey = typeof xAxis === "string" ? xAxis : xAxis.dataKey;

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      <ResponsiveContainer width={width || "100%"} height={height}>
        <RechartsBarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            bottom: 50,
            left: showYAxis ? (yAxisLabel ? 70 : 50) : 10
          }}
          barGap={barGap}
          barCategoryGap={barCategoryGap}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_THEME.grid.stroke}
            strokeWidth={CHART_THEME.grid.strokeWidth}
          />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: CHART_THEME.axis.fontSize }}
            stroke={CHART_THEME.axis.stroke}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          {showYAxis && (
            <YAxis
              tick={{ fontSize: CHART_THEME.axis.fontSize }}
              stroke={CHART_THEME.axis.stroke}
              allowDecimals={false}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: CHART_THEME.axis.stroke, textAnchor: "middle" }
              } : undefined}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {barSeries.map((s, index) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              fill={chartColors[index]}
              radius={[6, 6, 0, 0]}
              maxBarSize={50}
              stackId={s.stack}
            >
              {!s.stack &&
                data.map((_, entryIndex) => (
                  <Cell
                    key={`cell-${entryIndex}`}
                    fill={chartColors[index]}
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
