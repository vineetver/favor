"use client";

import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HeatmapData {
  variant: string;
  scoreType: string;
  score: number;
  category?: string;
  dataset?: string;
}

interface SimpleHeatmapProps {
  data: HeatmapData[];
  title?: string;
  metadata?: {
    totalScores?: number;
    variants?: string[];
    scoreTypes?: string[];
  };
}

// Color intensity based on value
const getHeatmapColor = (
  value: number | null,
  min: number,
  max: number,
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return "bg-gray-100 text-gray-400";
  }

  const normalized = (value - min) / (max - min);

  // Use CSS classes for different intensities
  if (normalized < 0.2) return "bg-blue-100 text-blue-900";
  if (normalized < 0.4) return "bg-blue-200 text-blue-900";
  if (normalized < 0.6) return "bg-blue-300 text-blue-900";
  if (normalized < 0.8) return "bg-blue-400 text-white";
  return "bg-blue-500 text-white";
};

export function SimpleHeatmap({
  data,
  title = "Functional Scores Heatmap",
  metadata,
}: SimpleHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    variant: string;
    scoreType: string;
  } | null>(null);

  const heatmapConfig = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const variants = Array.from(new Set(data.map((d) => d.variant)));
    const scoreTypes = Array.from(new Set(data.map((d) => d.scoreType)));

    // Calculate min/max for color scaling
    const allValues = data
      .map((d) => d.score)
      .filter((v) => v !== null && !isNaN(v));
    const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

    return {
      variants,
      scoreTypes,
      minValue,
      maxValue,
      matrix: variants.map((variant) =>
        scoreTypes.map((scoreType) => {
          const dataPoint = data.find(
            (d) => d.variant === variant && d.scoreType === scoreType,
          );
          return {
            variant,
            scoreType,
            value: dataPoint?.score ?? null,
            category: dataPoint?.category,
            dataset: dataPoint?.dataset,
          };
        }),
      ),
    };
  }, [data]);

  if (!data || data.length === 0) {
    return <Alert></Alert>;
  }

  if (!heatmapConfig) {
    return (
      <Alert>
        <AlertDescription>
          Unable to process heatmap data. Please check the data format.
        </AlertDescription>
      </Alert>
    );
  }

  const { variants, scoreTypes, minValue, maxValue, matrix } = heatmapConfig;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {metadata?.totalScores && (
            <span className="text-sm font-normal text-muted-foreground">
              {metadata.totalScores} scores
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Table structure for heatmap */}
            <div className="border rounded-lg overflow-hidden">
              {/* Header row */}
              <div className="bg-gray-50 border-b flex">
                <div className="w-32 p-2 border-r font-medium text-sm text-gray-600">
                  Variant
                </div>
                {scoreTypes.map((scoreType) => (
                  <div
                    key={scoreType}
                    className="w-20 p-2 border-r font-medium text-xs text-gray-600 text-center"
                    title={scoreType}
                  >
                    {scoreType.replace("_", " ").slice(0, 8)}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {matrix.map((row, rowIndex) => (
                <div
                  key={variants[rowIndex]}
                  className="flex border-b last:border-b-0"
                >
                  {/* Variant name */}
                  <div className="w-32 p-2 border-r font-medium text-sm bg-gray-50">
                    {variants[rowIndex]}
                  </div>

                  {/* Score cells */}
                  {row.map((cell, colIndex) => {
                    const colorClass = getHeatmapColor(
                      cell.value,
                      minValue,
                      maxValue,
                    );
                    const isHovered =
                      hoveredCell?.variant === cell.variant &&
                      hoveredCell?.scoreType === cell.scoreType;

                    return (
                      <div
                        key={`${cell.variant}-${cell.scoreType}`}
                        className={`
                          w-20 p-2 border-r text-xs text-center cursor-pointer transition-all
                          ${colorClass}
                          ${isHovered ? "ring-2 ring-blue-500 scale-105" : ""}
                        `}
                        onMouseEnter={() =>
                          setHoveredCell({
                            variant: cell.variant,
                            scoreType: cell.scoreType,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${cell.variant} - ${cell.scoreType}: ${
                          cell.value !== null ? cell.value.toFixed(3) : "N/A"
                        }`}
                      >
                        {cell.value !== null ? cell.value.toFixed(2) : "N/A"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend and info */}
        <div className="mt-4 space-y-3">
          {/* Color legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span>Color scale:</span>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-blue-100 border rounded"></div>
                <span>Low</span>
              </div>
              <div className="w-4 h-4 bg-blue-300 border rounded"></div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-blue-500 border rounded"></div>
                <span>High</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-gray-100 border rounded"></div>
                <span>No Data</span>
              </div>
            </div>
            <div>
              Range: {minValue.toFixed(3)} - {maxValue.toFixed(3)}
            </div>
          </div>

          {/* Hover info */}
          {hoveredCell && (
            <div className="p-2 bg-blue-50 rounded text-sm">
              <strong>{hoveredCell.variant}</strong> -{" "}
              {hoveredCell.scoreType.replace("_", " ").toUpperCase()}
              {(() => {
                const cell = matrix
                  .flat()
                  .find(
                    (c) =>
                      c.variant === hoveredCell.variant &&
                      c.scoreType === hoveredCell.scoreType,
                  );
                return cell && cell.value !== null
                  ? `: ${cell.value.toFixed(4)}`
                  : ": No data available";
              })()}
            </div>
          )}

          {/* Score explanations */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <div>
              <strong>Score Types:</strong>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {scoreTypes.includes("cadd") && (
                <div>
                  • CADD: Deleteriousness prediction (higher = more deleterious)
                </div>
              )}
              {scoreTypes.includes("revel") && (
                <div>• REVEL: Pathogenicity prediction (0-1 scale)</div>
              )}
              {scoreTypes.includes("spliceai") && (
                <div>• SpliceAI: Splice alteration prediction</div>
              )}
              {scoreTypes.includes("scent_max") && (
                <div>• SCENT: Max tissue-specific expression effect</div>
              )}
              {scoreTypes.includes("cv2f_avg") && (
                <div>• CV2F: Average conservation across tissues</div>
              )}
              {scoreTypes.includes("pgboost") && (
                <div>• PGBoost: Ensemble functional prediction</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
