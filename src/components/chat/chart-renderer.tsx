"use client";

import { BarChart } from "@/components/ui/charts/bar-chart";
import {
  transformChartData,
  validateChartData,
  getChartDataStats,
  type ChartType,
} from "@/lib/utils/chart-data-transforms";

interface ChartRendererProps {
  type: "chart";
  chartType: string;
  data: any;
  config: any;
  metadata?: any;
}

export function ChartRenderer({
  chartType,
  data,
  config,
  metadata,
}: ChartRendererProps) {
  // Transform data using universal transformer
  const transformedData = transformChartData(data, chartType as ChartType);
  const isValidData = validateChartData(data, chartType as ChartType);
  const dataStats = getChartDataStats(data, chartType as ChartType);

  if (!isValidData || !transformedData || transformedData.length === 0) {
    return (
      <div className="p-6 border border-dashed border-muted rounded-lg bg-muted/20">
        <div className="text-center">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            No Data Available
          </h4>
          <p className="text-xs text-muted-foreground">
            Unable to render bar chart with the provided data structure.
          </p>
          <details className="mt-3 text-left">
            <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
              Debug Information
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
              <div>
                <strong>Data Points:</strong> {dataStats.dataPoints}
              </div>
              <div>
                <strong>Data Structure:</strong> {typeof data}
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </div>
    );
  }

  const firstItem = transformedData[0] || {};
  const allKeys = Object.keys(firstItem).filter(
    (key) => key !== "name" && typeof firstItem[key] === "number",
  );
  const keys = allKeys.length > 0 ? allKeys : ["value"];

  return (
    <div className="my-1 w-full max-w-full overflow-hidden">
      <BarChart
        data={transformedData}
        keys={keys}
        indexBy="name"
        title={config.title}
        xLabel={config.xLabel}
        yLabel={config.yLabel}
        orientation={config.orientation}
        width={config.width}
        height={config.height || 300}
        formatYAxis={(value) => Math.round(value).toString()}
        className="w-full"
      />
      <details className="mt-1">
        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
          View Chart Data
        </summary>
        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
          <div className="font-mono">
            <div className="mb-1">
              <strong>Categories:</strong> {metadata?.categories || transformedData.length}
            </div>
            <details>
              <summary className="cursor-pointer">Raw Data</summary>
              <pre className="mt-1 overflow-x-auto">
                {JSON.stringify({ data, config, metadata }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </details>
    </div>
  );
}
