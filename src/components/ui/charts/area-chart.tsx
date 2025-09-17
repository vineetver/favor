"use client";

import React, { useRef } from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BaseChartWrapper,
  exportChartAsPNG,
} from "@/components/ui/charts/base-chart";
import {
  generateColors,
  CHART_THEME,
  CHART_MARGINS,
  type BaseChartProps,
  trimLabel,
} from "@/components/ui/charts/utils";

interface AreaChartProps extends BaseChartProps {
  keys: string[];
  indexBy?: string;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  stacked?: boolean;
  fillOpacity?: number;
  strokeWidth?: number;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltipValue?: (value: any) => string;
  curve?: "linear" | "monotone" | "cardinal" | "basis" | "step";
  xDomain?: [number | string, number | string];
  yDomain?: [number | string, number | string];
  connectNulls?: boolean;
}

export function AreaChart({
  data,
  keys,
  indexBy = "name",
  width,
  height = 400,
  margin = CHART_MARGINS.default,
  colors,
  className,
  title,
  subtitle,
  xLabel,
  yLabel,
  showLegend = true,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  stacked = false,
  fillOpacity = 0.6,
  strokeWidth = 2,
  responsive = true,
  formatXAxis,
  formatYAxis,
  formatTooltipValue,
  curve = "monotone",
  xDomain,
  yDomain,
  connectNulls = false,
}: AreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartColors = colors || generateColors(keys.length);

  const handleExport = () => {
    exportChartAsPNG(
      chartRef,
      title?.toLowerCase().replace(/\s+/g, "-") || "area-chart",
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">
          {formatXAxis ? formatXAxis(label) : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.dataKey}:</span>
            <span className="font-mono font-medium">
              {formatTooltipValue
                ? formatTooltipValue(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || !payload.length) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div ref={chartRef}>
      <BaseChartWrapper
        data={data}
        width={width}
        height={height}
        className={className}
        title={title}
        subtitle={subtitle}
        onExport={handleExport}
        responsive={responsive}
      >
        <RechartsAreaChart data={data} margin={margin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_THEME.grid.stroke}
              strokeWidth={CHART_THEME.grid.strokeWidth}
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={indexBy}
              domain={xDomain}
              tick={{ fontSize: CHART_THEME.axis.fontSize }}
              stroke={CHART_THEME.axis.stroke}
              tickFormatter={(value) => {
                const formatted = formatXAxis ? formatXAxis(value) : value;
                return trimLabel(formatted, 12);
              }}
              label={
                xLabel
                  ? { value: xLabel, position: "insideBottom", offset: -5 }
                  : undefined
              }
            />
          )}
          {showYAxis && (
            <YAxis
              domain={yDomain || ["dataMin", "dataMax"]}
              tick={{ fontSize: CHART_THEME.axis.fontSize }}
              stroke={CHART_THEME.axis.stroke}
              tickFormatter={formatYAxis}
              label={
                yLabel
                  ? { value: yLabel, angle: -90, position: "insideLeft" }
                  : undefined
              }
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
          {keys.map((key, index) => (
            <Area
              key={key}
              dataKey={key}
              fill={chartColors[index]}
              stroke={chartColors[index]}
              strokeWidth={strokeWidth}
              fillOpacity={fillOpacity}
              type={curve as any}
              connectNulls={connectNulls}
              stackId={stacked ? "1" : undefined}
            />
          ))}
        </RechartsAreaChart>
      </BaseChartWrapper>
    </div>
  );
}
