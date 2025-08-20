"use client";

import React, { useRef } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { BaseChartWrapper, exportChartAsPNG } from "@/components/ui/charts/base-chart";
import {
  generateColors,
  formatAlleleFrequency,
  createTooltipFormatter,
  createLabelFormatter,
  trimLabel,
  CHART_THEME,
  CHART_MARGINS,
  type BaseChartProps,
} from "@/components/ui/charts/utils";

interface BarChartProps extends BaseChartProps {
  keys: string[];
  indexBy?: string;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  orientation?: "horizontal" | "vertical";
  stackedBars?: boolean;
  groupedBars?: boolean;
  barSize?: number;
  barGap?: number;
  categoryGap?: number;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltipValue?: (value: any) => string;
  tickAngle?: number;
  maxBarSize?: number;
  onBarClick?: (data: any, index: number) => void;
  showDataLabels?: boolean;
  borderRadius?: number | [number, number, number, number];
}

export function BarChart({
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
  orientation = "vertical",
  stackedBars = false,
  groupedBars = true,
  barSize,
  barGap = 4,
  categoryGap = 20,
  responsive = true,
  formatXAxis,
  formatYAxis = formatAlleleFrequency,
  formatTooltipValue = formatAlleleFrequency,
  tickAngle = -45,
  maxBarSize = 50,
  onBarClick,
  showDataLabels = false,
  borderRadius = 6,
}: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartColors = colors || generateColors(keys.length);

  const handleExport = () => {
    exportChartAsPNG(chartRef, title?.toLowerCase().replace(/\s+/g, "-") || "bar-chart");
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
              {formatTooltipValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || !payload.length) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-10">
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

  const getBarRadius = (): [number, number, number, number] => {
    if (typeof borderRadius === "number") {
      return orientation === "vertical" 
        ? [borderRadius, borderRadius, 0, 0] as [number, number, number, number]
        : [0, borderRadius, borderRadius, 0] as [number, number, number, number];
    }
    return borderRadius || [6, 6, 0, 0];
  };

  const renderBars = () => {
    return keys.map((key, index) => (
      <Bar
        key={key}
        dataKey={key}
        fill={chartColors[index]}
        radius={getBarRadius()}
        maxBarSize={maxBarSize}
        onClick={onBarClick ? (data, index) => onBarClick(data, index) : undefined}
        className={onBarClick ? "cursor-pointer" : undefined}
      >
        {!stackedBars && data.map((entry, entryIndex) => (
          <Cell 
            key={`cell-${entryIndex}`} 
            fill={chartColors[index]}
            className={onBarClick ? "hover:opacity-80" : undefined}
          />
        ))}
      </Bar>
    ));
  };

  const chart = orientation === "vertical" ? (
    <RechartsBarChart
      data={data}
      margin={margin}
      barCategoryGap={categoryGap}
      barGap={barGap}
    >
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
          tick={{ fontSize: CHART_THEME.axis.fontSize }}
          stroke={CHART_THEME.axis.stroke}
          tickFormatter={(value) => {
            const formatted = formatXAxis ? formatXAxis(value) : value;
            return trimLabel(formatted, 12); // Limit to 12 characters
          }}
          angle={tickAngle}
          textAnchor={tickAngle < 0 ? "end" : "start"}
          height={Math.abs(tickAngle) > 45 ? 60 : 40}
        />
      )}
      {showYAxis && (
        <YAxis
          tick={{ fontSize: CHART_THEME.axis.fontSize }}
          stroke={CHART_THEME.axis.stroke}
          tickFormatter={formatYAxis}
          domain={["dataMin", "dataMax"]}
        />
      )}
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend content={<CustomLegend />} />}
      {renderBars()}
    </RechartsBarChart>
  ) : (
    // Horizontal orientation - swap X and Y
    <RechartsBarChart
      layout="horizontal"
      data={data}
      margin={margin}
      barCategoryGap={categoryGap}
      barGap={barGap}
    >
      {showGrid && (
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_THEME.grid.stroke}
          strokeWidth={CHART_THEME.grid.strokeWidth}
        />
      )}
      {showXAxis && (
        <XAxis
          type="number"
          tick={{ fontSize: CHART_THEME.axis.fontSize }}
          stroke={CHART_THEME.axis.stroke}
          tickFormatter={formatYAxis}
          domain={["dataMin", "dataMax"]}
        />
      )}
      {showYAxis && (
        <YAxis
          type="category"
          dataKey={indexBy}
          tick={{ fontSize: CHART_THEME.axis.fontSize }}
          stroke={CHART_THEME.axis.stroke}
          tickFormatter={(value) => {
            const formatted = formatXAxis ? formatXAxis(value) : value;
            return trimLabel(formatted, 15); // Slightly longer for Y-axis
          }}
          width={120}
        />
      )}
      <Tooltip content={<CustomTooltip />} />
      {showLegend && <Legend content={<CustomLegend />} />}
      {renderBars()}
    </RechartsBarChart>
  );

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
        {chart}
      </BaseChartWrapper>
    </div>
  );
}