"use client";

import React, { useRef } from "react";
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { BaseChartWrapper, exportChartAsPNG } from "./base-chart";
import {
  generateColors,
  CHART_THEME,
  CHART_MARGINS,
  type BaseChartProps,
} from "./utils";

interface ScatterChartProps extends BaseChartProps {
  xDataKey: string;
  yDataKey: string;
  colorByKey?: string;
  sizeKey?: string;
  xLabel?: string;
  yLabel?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
  formatTooltipValue?: (value: any, name?: string) => string;
  onDotClick?: (data: any, index: number) => void;
  dotSize?: number;
  minDotSize?: number;
  maxDotSize?: number;
  xDomain?: [number | string, number | string];
  yDomain?: [number | string, number | string];
  logScale?: {
    x?: boolean;
    y?: boolean;
  };
}

export function ScatterChart({
  data,
  xDataKey,
  yDataKey,
  colorByKey,
  sizeKey,
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
  responsive = true,
  formatXAxis,
  formatYAxis,
  formatTooltipValue,
  onDotClick,
  dotSize = 6,
  minDotSize = 4,
  maxDotSize = 12,
  xDomain,
  yDomain,
  logScale = {},
}: ScatterChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const processedData = React.useMemo(() => {
    if (!colorByKey) return [{ name: "data", data }];

    const grouped = data.reduce((acc, item) => {
      const group = item[colorByKey];
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([name, items]) => ({
      name,
      data: items,
    }));
  }, [data, colorByKey]);

  const chartColors = colors || generateColors(processedData.length);

  const getSizeValue = (item: any): number => {
    if (!sizeKey || !item[sizeKey]) return dotSize;
    const value = item[sizeKey];
    const max = Math.max(...data.map(d => d[sizeKey] || 0));
    const min = Math.min(...data.map(d => d[sizeKey] || 0));
    const normalized = (value - min) / (max - min);
    return minDotSize + (maxDotSize - minDotSize) * normalized;
  };

  const handleExport = () => {
    exportChartAsPNG(chartRef, title?.toLowerCase().replace(/\s+/g, "-") || "scatter-chart");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="space-y-2">
          {colorByKey && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: payload[0]?.fill }}
              />
              <span className="font-medium">{data[colorByKey]}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">{xLabel || xDataKey}:</span>
              <div className="font-mono font-medium">
                {formatTooltipValue 
                  ? formatTooltipValue(data[xDataKey], xDataKey)
                  : formatXAxis 
                  ? formatXAxis(data[xDataKey])
                  : data[xDataKey]
                }
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">{yLabel || yDataKey}:</span>
              <div className="font-mono font-medium">
                {formatTooltipValue 
                  ? formatTooltipValue(data[yDataKey], yDataKey)
                  : formatYAxis 
                  ? formatYAxis(data[yDataKey])
                  : data[yDataKey]
                }
              </div>
            </div>
          </div>
          {sizeKey && (
            <div className="text-xs">
              <span className="text-muted-foreground">{sizeKey}:</span>
              <span className="font-mono font-medium ml-1">
                {formatTooltipValue 
                  ? formatTooltipValue(data[sizeKey], sizeKey)
                  : data[sizeKey]
                }
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || !payload.length || !colorByKey) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground capitalize">{entry.value}</span>
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
        <RechartsScatterChart data={data} margin={margin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_THEME.grid.stroke}
              strokeWidth={CHART_THEME.grid.strokeWidth}
            />
          )}
          {showXAxis && (
            <XAxis
              dataKey={xDataKey}
              type="number"
              scale={logScale.x ? "log" : "linear"}
              domain={xDomain || ["dataMin", "dataMax"]}
              tick={{ fontSize: CHART_THEME.axis.fontSize }}
              stroke={CHART_THEME.axis.stroke}
              tickFormatter={formatXAxis}
            />
          )}
          {showYAxis && (
            <YAxis
              dataKey={yDataKey}
              type="number"
              scale={logScale.y ? "log" : "linear"}
              domain={yDomain || ["dataMin", "dataMax"]}
              tick={{ fontSize: CHART_THEME.axis.fontSize }}
              stroke={CHART_THEME.axis.stroke}
              tickFormatter={formatYAxis}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && colorByKey && <Legend content={<CustomLegend />} />}
          {processedData.map((group, groupIndex) => (
            <Scatter
              key={group.name}
              name={group.name}
              data={group.data as any[]}
              fill={chartColors[groupIndex]}
            >
              {(group.data as any[]).map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartColors[groupIndex]}
                  r={getSizeValue(entry)}
                  className={onDotClick ? "cursor-pointer hover:opacity-80" : ""}
                  onClick={onDotClick ? () => onDotClick(entry, index) : undefined}
                />
              ))}
            </Scatter>
          ))}
        </RechartsScatterChart>
      </BaseChartWrapper>
    </div>
  );
}