"use client";

import React, { useMemo, useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BaseChartWrapper,
  exportChartAsPNG,
} from "@/components/ui/charts/base-chart";
import {
  generateColors,
  type BaseChartProps,
} from "@/components/ui/charts/utils";

interface HeatmapData {
  variant?: string;
  scoreType?: string;
  score?: number;
  category?: string;
  dataset?: string;
  x?: string | number;
  y?: string | number;
  value?: number;
  name?: string;
}

interface HeatmapProps extends BaseChartProps {
  xKey?: string;
  yKey?: string;
  valueKey?: string;
  formatValue?: (value: number) => string;
  colorScheme?: "blue" | "red" | "green" | "purple";
  showTooltip?: boolean;
  cellSize?: number;
  minCellSize?: number;
  maxCellSize?: number;
}

const getHeatmapColor = (
  value: number | null,
  min: number,
  max: number,
  scheme: string = "blue",
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "bg-gray-100 text-gray-400";
  }

  const normalized = (value - min) / (max - min);

  const colorMaps = {
    blue: [
      "bg-blue-100 text-blue-900",
      "bg-blue-200 text-blue-900",
      "bg-blue-300 text-blue-900",
      "bg-blue-400 text-white",
      "bg-blue-500 text-white",
    ],
    red: [
      "bg-red-100 text-red-900",
      "bg-red-200 text-red-900",
      "bg-red-300 text-red-900",
      "bg-red-400 text-white",
      "bg-red-500 text-white",
    ],
    green: [
      "bg-green-100 text-green-900",
      "bg-green-200 text-green-900",
      "bg-green-300 text-green-900",
      "bg-green-400 text-white",
      "bg-green-500 text-white",
    ],
    purple: [
      "bg-purple-100 text-purple-900",
      "bg-purple-200 text-purple-900",
      "bg-purple-300 text-purple-900",
      "bg-purple-400 text-white",
      "bg-purple-500 text-white",
    ],
  };

  const colors = colorMaps[scheme as keyof typeof colorMaps] || colorMaps.blue;

  if (normalized < 0.2) return colors[0];
  if (normalized < 0.4) return colors[1];
  if (normalized < 0.6) return colors[2];
  if (normalized < 0.8) return colors[3];
  return colors[4];
};

export function Heatmap({
  data,
  width,
  height = 400,
  className,
  title,
  subtitle,
  responsive = true,
  xKey = "x",
  yKey = "y",
  valueKey = "value",
  formatValue,
  colorScheme = "blue",
  showTooltip = true,
  cellSize = 20,
}: HeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    x: string;
    y: string;
  } | null>(null);

  const handleExport = () => {
    exportChartAsPNG(
      chartRef,
      title?.toLowerCase().replace(/\s+/g, "-") || "heatmap",
    );
  };

  const heatmapConfig = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    // Handle different data formats
    let processedData = data;

    // If data has variant/scoreType format (from SimpleHeatmap)
    if (data.some((d) => "variant" in d && "scoreType" in d)) {
      processedData = data.map((d) => ({
        x: d.variant,
        y: d.scoreType,
        value: d.score,
        ...d,
      }));
    } else if (data.some((d) => "name" in d && "category" in d)) {
      // Generic name/category format
      processedData = data.map((d) => ({
        x: d.category || d.name,
        y: d.name || d.category,
        value: d.value,
        ...d,
      }));
    }

    const xValues = Array.from(new Set(processedData.map((d: any) => d[xKey])));
    const yValues = Array.from(new Set(processedData.map((d: any) => d[yKey])));

    const allValues = processedData
      .map((d: any) => d[valueKey])
      .filter((v: any) => v !== null && !isNaN(v));
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

    return {
      xValues,
      yValues,
      minValue,
      maxValue,
      matrix: yValues.map((y) =>
        xValues.map((x) => {
          const dataPoint = processedData.find(
            (d: any) => d[xKey] === x && d[yKey] === y,
          );
          return {
            x,
            y,
            value: dataPoint?.[valueKey] ?? null,
            original: dataPoint,
          };
        }),
      ),
    };
  }, [data, xKey, yKey, valueKey]);

  if (!data || data.length === 0) {
    return (
      <BaseChartWrapper
        data={data}
        width={width}
        height={height}
        className={className}
        title={title}
        subtitle={subtitle}
        onExport={handleExport}
        responsive={responsive}
        emptyMessage="No data available for heatmap"
      >
        <div />
      </BaseChartWrapper>
    );
  }

  if (!heatmapConfig) {
    return (
      <BaseChartWrapper
        data={data}
        width={width}
        height={height}
        className={className}
        title={title}
        subtitle={subtitle}
        onExport={handleExport}
        responsive={responsive}
        error="Unable to process heatmap data. Please check the data format."
      >
        <div />
      </BaseChartWrapper>
    );
  }

  const { xValues, yValues, minValue, maxValue, matrix } = heatmapConfig;

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
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="bg-gray-50 border-b flex">
                <div className="w-32 p-2 border-r font-medium text-sm text-gray-600">
                  {yKey}
                </div>
                {xValues.map((xVal) => (
                  <div
                    key={String(xVal)}
                    className="w-20 p-2 border-r font-medium text-xs text-gray-600 text-center"
                    title={String(xVal)}
                  >
                    {String(xVal).replace("_", " ").slice(0, 8)}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {matrix.map((row, rowIndex) => (
                <div
                  key={String(yValues[rowIndex])}
                  className="flex border-b last:border-b-0"
                >
                  <div className="w-32 p-2 border-r font-medium text-sm bg-gray-50">
                    {String(yValues[rowIndex])}
                  </div>

                  {row.map((cell) => {
                    const colorClass = getHeatmapColor(
                      cell.value,
                      minValue,
                      maxValue,
                      colorScheme,
                    );
                    const isHovered =
                      hoveredCell?.x === cell.x && hoveredCell?.y === cell.y;

                    return (
                      <div
                        key={`${cell.x}-${cell.y}`}
                        className={`
                          w-20 p-2 border-r text-xs text-center cursor-pointer transition-all
                          ${colorClass}
                          ${isHovered ? "ring-2 ring-blue-500 scale-105" : ""}
                        `}
                        onMouseEnter={() =>
                          showTooltip &&
                          setHoveredCell({
                            x: String(cell.x),
                            y: String(cell.y),
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${cell.y} - ${cell.x}: ${
                          cell.value !== null
                            ? formatValue
                              ? formatValue(cell.value)
                              : cell.value.toFixed(3)
                            : "N/A"
                        }`}
                      >
                        {cell.value !== null
                          ? formatValue
                            ? formatValue(cell.value)
                            : cell.value.toFixed(2)
                          : "N/A"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend and info */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-3">
                <span>Color scale:</span>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-4 h-4 border rounded ${
                      colorScheme === "blue"
                        ? "bg-blue-100"
                        : colorScheme === "red"
                          ? "bg-red-100"
                          : colorScheme === "green"
                            ? "bg-green-100"
                            : "bg-purple-100"
                    }`}
                  ></div>
                  <span>Low</span>
                </div>
                <div
                  className={`w-4 h-4 border rounded ${
                    colorScheme === "blue"
                      ? "bg-blue-300"
                      : colorScheme === "red"
                        ? "bg-red-300"
                        : colorScheme === "green"
                          ? "bg-green-300"
                          : "bg-purple-300"
                  }`}
                ></div>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-4 h-4 border rounded ${
                      colorScheme === "blue"
                        ? "bg-blue-500"
                        : colorScheme === "red"
                          ? "bg-red-500"
                          : colorScheme === "green"
                            ? "bg-green-500"
                            : "bg-purple-500"
                    }`}
                  ></div>
                  <span>High</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                  <span>No Data</span>
                </div>
              </div>
              <div>
                Range:{" "}
                {formatValue
                  ? `${formatValue(minValue)} - ${formatValue(maxValue)}`
                  : `${minValue.toFixed(3)} - ${maxValue.toFixed(3)}`}
              </div>
            </div>

            {/* Hover info */}
            {hoveredCell && showTooltip && (
              <div className="p-2 bg-blue-50 rounded text-sm">
                <strong>{hoveredCell.y}</strong> -{" "}
                {hoveredCell.x.replace("_", " ").toUpperCase()}
                {(() => {
                  const cell = matrix
                    .flat()
                    .find(
                      (c) => c.x === hoveredCell.x && c.y === hoveredCell.y,
                    );
                  return cell && cell.value !== null
                    ? `: ${
                        formatValue
                          ? formatValue(cell.value)
                          : cell.value.toFixed(4)
                      }`
                    : ": No data available";
                })()}
              </div>
            )}
          </div>
        </div>
      </BaseChartWrapper>
    </div>
  );
}
