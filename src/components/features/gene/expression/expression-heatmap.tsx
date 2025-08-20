"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/general";

interface ProcessedExpressionData {
  tissue: string;
  value: number;
  accessor: string;
}

interface ExpressionHeatmapProps {
  data: ProcessedExpressionData[];
  geneName: string;
  scaleMode: "linear" | "log";
  maxValue: number;
}

export function ExpressionHeatmap({
  data,
  geneName,
  scaleMode,
  maxValue,
}: ExpressionHeatmapProps) {
  const [itemsPerRow, setItemsPerRow] = useState(10);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    const updateItemsPerRow = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 640) {
          setItemsPerRow(5);
        } else if (window.innerWidth < 1024) {
          setItemsPerRow(8);
        } else {
          setItemsPerRow(10);
        }
      }
    };

    updateItemsPerRow();
    window?.addEventListener("resize", updateItemsPerRow);
    return () => window?.removeEventListener("resize", updateItemsPerRow);
  }, []);

  const getScaledValue = (value: number): number => {
    if (value === 0) return 0;
    if (scaleMode === "log") {
      return Math.log10(value + 1);
    }
    return value;
  };

  const getMaxScaled = (): number => {
    if (scaleMode === "log") {
      return Math.log10(maxValue + 1);
    }
    return maxValue;
  };

  const getHeatmapColor = (
    value: number,
    isHovered: boolean = false,
  ): string => {
    if (value === 0) return isHovered ? "#e5e7eb" : "#f9fafb";

    const scaledValue = getScaledValue(value);
    const maxScaled = getMaxScaled();
    const intensity = maxScaled > 0 ? scaledValue / maxScaled : 0;

    // Enhanced gradient: purple to blue to teal for high expression
    let hue: number;
    let saturation: number;
    let lightness: number;

    if (intensity < 0.3) {
      // Low expression: light blue
      hue = 200;
      saturation = Math.floor(30 + intensity * 20);
      lightness = Math.floor(92 - intensity * 30);
    } else if (intensity < 0.6) {
      // Medium expression: blue to purple
      hue = 220 - (intensity - 0.3) * 50;
      saturation = Math.floor(50 + intensity * 25);
      lightness = Math.floor(85 - intensity * 40);
    } else {
      // High expression: purple to magenta
      hue = 280 - (intensity - 0.6) * 30;
      saturation = Math.floor(70 + intensity * 20);
      lightness = Math.floor(70 - intensity * 45);
    }

    if (isHovered) {
      saturation = Math.min(100, saturation + 15);
      lightness = Math.max(10, lightness - 5);
    }

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Create grid structure
  const rows = Math.ceil(data.length / itemsPerRow);
  const grid = [];

  for (let i = 0; i < rows; i++) {
    const rowData = data.slice(i * itemsPerRow, (i + 1) * itemsPerRow);
    grid.push(rowData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {geneName} Expression Heatmap - TPM (
          {scaleMode === "log" ? "Log10" : "Linear"} Scale)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Heatmap Grid */}
        <div className="space-y-1.5">
          {grid.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)` }}
            >
              {row.map((item, cellIndex) => {
                const cellKey = `${rowIndex}-${cellIndex}`;
                const isCellHovered = hoveredCell === cellKey;

                return (
                  <Tooltip key={item.accessor}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "aspect-square rounded-md border transition-all duration-200 cursor-pointer relative",
                          isCellHovered
                            ? "border-primary/50 shadow-lg ring-2 ring-primary/20"
                            : "border-border/30",
                        )}
                        style={{
                          backgroundColor: getHeatmapColor(
                            item.value,
                            isCellHovered,
                          ),
                        }}
                        onMouseEnter={() => setHoveredCell(cellKey)}
                        onMouseLeave={() => setHoveredCell(null)}
                      ></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="font-semibold">{item.tissue}</div>
                        <div className="text-xs opacity-80">
                          {item.value.toFixed(2)} TPM
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {/* Fill empty cells in incomplete rows */}
              {row.length < itemsPerRow &&
                Array.from({ length: itemsPerRow - row.length }).map(
                  (_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ),
                )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
