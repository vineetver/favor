"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProcessedExpressionData {
  tissue: string;
  value: number;
  accessor: string;
}

interface HorizontalBarChartProps {
  data: ProcessedExpressionData[];
  geneName: string;
  scaleMode: "linear" | "log";
  maxValue: number;
}

export function HorizontalBarChart({
  data,
  geneName,
  scaleMode,
  maxValue,
}: HorizontalBarChartProps) {
  // Sort data by value for better visualization
  const sortedData = [...data].sort((a, b) => b.value - a.value);
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

  const getBarWidth = (value: number): number => {
    const scaledValue = getScaledValue(value);
    const maxScaled = getMaxScaled();
    return maxScaled > 0 ? (scaledValue / maxScaled) * 100 : 0;
  };

  const getBarColor = (value: number, isHovered: boolean = false): string => {
    const scaledValue = getScaledValue(value);
    const maxScaled = getMaxScaled();
    const intensity = maxScaled > 0 ? scaledValue / maxScaled : 0;

    // Enhanced gradient similar to heatmap
    let hue: number;
    let saturation: number;
    let lightness: number;

    if (intensity < 0.3) {
      hue = 200;
      saturation = 60;
      lightness = 70;
    } else if (intensity < 0.6) {
      hue = 220 - (intensity - 0.3) * 50;
      saturation = 70;
      lightness = 60;
    } else {
      hue = 280 - (intensity - 0.6) * 30;
      saturation = 80;
      lightness = 50;
    }

    if (isHovered) {
      saturation = Math.min(100, saturation + 10);
      lightness = Math.max(30, lightness - 10);
    }

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {geneName} Expression Profile - TPM (
          {scaleMode === "log" ? "Log10" : "Linear"} Scale)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedData.map((item) => (
            <div
              key={item.accessor}
              className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 hover:bg-muted/50 px-1 py-0.5 rounded transition-colors"
            >
              <div
                className="w-full sm:w-44 text-sm font-medium text-foreground truncate"
                title={item.tissue}
              >
                {item.tissue}
              </div>
              <div className="flex-1 relative h-5 bg-muted rounded min-w-0">
                <div
                  className="absolute left-0 top-0 h-full rounded transition-all duration-300"
                  style={{
                    width: `${Math.min(getBarWidth(item.value), 85)}%`,
                    backgroundColor: getBarColor(item.value),
                  }}
                />
                <div className="absolute right-2 top-0 h-full flex items-center z-10">
                  <span className="text-xs font-medium text-foreground bg-background/80 px-1 rounded">
                    {item.value.toFixed(2)} TPM
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
