"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NoDataState } from "@/components/ui/error-states";
import { FilteredItem } from "@/lib/annotations/types";
import { BarChart } from "@/components/ui/charts/bar-chart";

interface IntegrativeDisplayProps {
  items: FilteredItem[];
}

function extractNumericValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseFloat(value) || 0;
  }
  if (
    typeof value === "object" &&
    value &&
    "props" in value &&
    typeof (value as any).props === "object" &&
    (value as any).props &&
    "children" in (value as any).props
  ) {
    const spanValue = (value as any).props.children;
    return typeof spanValue === "number"
      ? spanValue
      : parseFloat(String(spanValue)) || 0;
  }
  return 0;
}

export function IntegrativeDisplay({ items }: IntegrativeDisplayProps) {
  const visualizationData = useMemo(() => {
    if (!items || items.length === 0) {
      return null;
    }

    const percentileGroups = items.reduce(
      (acc, item) => {
        if (!item.percentile) return acc;

        const percentileValue = extractNumericValue(item.percentile);

        const range =
          percentileValue >= 90
            ? "90-100%"
            : percentileValue >= 75
              ? "75-89%"
              : percentileValue >= 50
                ? "50-74%"
                : percentileValue >= 25
                  ? "25-49%"
                  : "0-24%";

        if (!acc[range]) {
          acc[range] = [];
        }
        acc[range].push(item);
        return acc;
      },
      {} as Record<string, FilteredItem[]>,
    );

    const chartData = items
      .map((item) => {
        const numericValue = extractNumericValue(item.value);
        const percentileValue = extractNumericValue(item.percentile);

        const getColorFromPercentile = (percentile: number) => {
          if (percentile >= 90) return "#dc2626";
          if (percentile >= 75) return "#ea580c";
          if (percentile >= 50) return "#d97706";
          if (percentile >= 25) return "#65a30d";
          return "#16a34a";
        };

        const color = getColorFromPercentile(percentileValue);

        return {
          header: item.header,
          value: numericValue,
          percentile: percentileValue,
          percentileSpan: item.percentile,
          color: color,
          tooltip: typeof item.tooltip === "string" ? item.tooltip : "",
        };
      })
      .sort((a, b) => b.value - a.value);

    const totalItems = items.length;

    return {
      percentileGroups,
      chartData,
      totalItems,
    };
  }, [items]);

  if (!visualizationData) {
    return <NoDataState categoryName="Integrative Data" />;
  }

  const { percentileGroups, chartData, totalItems } = visualizationData;

  return (
    <BarChart
      data={chartData}
      keys={["value"]}
      indexBy="header"
      title="PHRED Integrative Scores"
      yLabel="PHRED Integrative Score"
      xLabel=""
      showLegend={false}
      height={430}
      margin={{ top: 5, right: 10, bottom: 80, left: 60 }}
    />
  );
}
