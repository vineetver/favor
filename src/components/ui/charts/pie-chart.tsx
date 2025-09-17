"use client";

import React, { useRef } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BaseChartWrapper,
  exportChartAsPNG,
} from "@/components/ui/charts/base-chart";
import {
  generateColors,
  type BaseChartProps,
} from "@/components/ui/charts/utils";

interface PieChartProps extends BaseChartProps {
  dataKey: string;
  nameKey?: string;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  showLabels?: boolean;
  formatTooltipValue?: (value: any) => string;
  formatLabel?: (value: any) => string;
  labelLine?: boolean;
  onSliceClick?: (data: any, index: number) => void;
}

export function PieChart({
  data,
  dataKey,
  nameKey = "name",
  width,
  height = 400,
  colors,
  className,
  title,
  subtitle,
  showLegend = true,
  responsive = true,
  innerRadius = 0,
  outerRadius,
  startAngle = 0,
  endAngle = 360,
  showLabels = true,
  formatTooltipValue,
  formatLabel,
  labelLine = true,
  onSliceClick,
}: PieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartColors = colors || generateColors(data.length);

  const handleExport = () => {
    exportChartAsPNG(
      chartRef,
      title?.toLowerCase().replace(/\s+/g, "-") || "pie-chart",
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: payload[0]?.payload?.fill }}
          />
          <span className="font-medium">{data[nameKey]}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Value:</span>
          <span className="font-mono font-medium ml-2">
            {formatTooltipValue
              ? formatTooltipValue(data[dataKey])
              : data[dataKey]}
          </span>
        </div>
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

  const renderLabel = (entry: any) => {
    if (!showLabels) return null;

    const value = formatLabel ? formatLabel(entry[dataKey]) : entry[dataKey];
    const name = entry[nameKey];

    // Calculate percentage
    const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
    const percentage =
      total > 0 ? ((entry[dataKey] / total) * 100).toFixed(1) : "0.0";

    return `${name}: ${percentage}%`;
  };

  const calculatedOuterRadius =
    outerRadius || Math.min(height, width || 400) / 3;

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
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={calculatedOuterRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            label={showLabels ? renderLabel : false}
            labelLine={labelLine}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || chartColors[index % chartColors.length]}
                className={
                  onSliceClick ? "cursor-pointer hover:opacity-80" : ""
                }
                onClick={
                  onSliceClick ? () => onSliceClick(entry, index) : undefined
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={<CustomLegend />} />}
        </RechartsPieChart>
      </BaseChartWrapper>
    </div>
  );
}
