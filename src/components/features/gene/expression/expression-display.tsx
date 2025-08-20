"use client";

import type { FilteredItem } from "@/lib/annotations/types";
import { useState, useMemo } from "react";
import { BarChart3Icon, GridIcon } from "lucide-react";
import { RuntimeError, NoDataState } from "@/components/ui/error-states";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HorizontalBarChart } from "./horizontal-bar-chart";
import { ExpressionHeatmap } from "./expression-heatmap";
import { ExpressionLegend } from "./expression-legend";

interface ExpressionDisplayProps {
  expressionData: FilteredItem[];
  geneName: string;
  isLoading?: boolean;
  error?: Error;
  onRetry?: () => void;
}

type ViewMode = "bar" | "heatmap";
type ScaleMode = "linear" | "log";

export function ExpressionDisplay({
  expressionData,
  geneName,
  isLoading = false,
  error,
  onRetry,
}: ExpressionDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("bar");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("linear");

  const processedData = useMemo(() => {
    let data = expressionData.map((item) => ({
      tissue: item.header,
      value: typeof item.value === "number" ? item.value : 0,
      accessor: item.accessor,
    }));

    // Always filter to show only expressed tissues and sort by expression
    data = data.filter((item) => item.value > 0);
    data.sort((a, b) => b.value - a.value);

    return data;
  }, [expressionData]);

  const maxValue = Math.max(...processedData.map((d) => d.value));

  if (error) {
    return (
      <RuntimeError
        error={error}
        reset={onRetry}
        categoryName="Expression Data"
        title="Failed to Load Expression Data"
        description="We encountered an error while loading the gene expression data. This could be due to a network issue or a temporary server problem."
      />
    );
  }

  if (!expressionData || expressionData.length === 0) {
    return (
      <NoDataState
        categoryName="Expression Data"
        title="No Expression Data Available"
        description={`No gene expression data is available for ${geneName}.`}
      />
    );
  }

  const expressedTissues = processedData.length;
  const avgExpression =
    expressedTissues > 0
      ? processedData.reduce((sum, d) => sum + d.value, 0) / expressedTissues
      : 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* View Mode */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground shrink-0">
                  View:
                </label>
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(value) =>
                    value && setViewMode(value as ViewMode)
                  }
                  variant="outline"
                >
                  <ToggleGroupItem value="bar" aria-label="Bar chart">
                    <BarChart3Icon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="heatmap" aria-label="Heatmap">
                    <GridIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Scale Mode */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground shrink-0">
                  Scale:
                </label>
                <Select
                  value={scaleMode}
                  onValueChange={(value) => setScaleMode(value as ScaleMode)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="log">Log10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expression Legend */}
            <div className="flex justify-end">
              <ExpressionLegend scaleMode={scaleMode} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization */}
      {viewMode === "bar" && (
        <HorizontalBarChart
          data={processedData}
          geneName={geneName}
          scaleMode={scaleMode}
          maxValue={maxValue}
        />
      )}
      {viewMode === "heatmap" && (
        <ExpressionHeatmap
          data={processedData}
          geneName={geneName}
          scaleMode={scaleMode}
          maxValue={maxValue}
        />
      )}
    </div>
  );
}
