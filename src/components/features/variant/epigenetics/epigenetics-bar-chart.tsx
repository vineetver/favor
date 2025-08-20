"use client";

import { useMemo, useRef } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoDataState } from "@/components/ui/error-states";
import {
  CHART_THEME,
  CHART_MARGINS,
  trimLabel,
} from "@/components/ui/charts/utils";
import { cn } from "@/lib/utils/general";
import type { FilteredItem } from "@/lib/annotations/types";

interface EpigeneticsBarChartProps {
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

function getActivityColor(activity: any): string {
  if (!activity || typeof activity !== "object" || !activity.props) {
    return "#9ca3af";
  }

  const className = activity.props.className || "";

  if (className.includes("bg-green")) return "#4ade80";
  if (className.includes("bg-amber")) return "#fbbf24";
  if (className.includes("bg-indigo")) return "#818cf8";
  if (className.includes("bg-red")) return "#f87171";
  if (className.includes("bg-purple")) return "#c084fc";
  if (className.includes("bg-blue")) return "#60a5fa";
  return "#9ca3af";
}

const exportChartAsPNG = (
  chartRef: React.RefObject<HTMLDivElement>,
  filename: string,
) => {
  if (!chartRef.current) return;

  const svgElement = chartRef.current.querySelector("svg");
  if (!svgElement) return;

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgRect = svgElement.getBoundingClientRect();
    canvas.width = svgRect.width * 2;
    canvas.height = svgRect.height * 2;
    ctx.scale(2, 2);

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, svgRect.width, svgRect.height);
      ctx.drawImage(img, 0, 0);

      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (error) {
    console.error("Error exporting chart:", error);
  }
};

export function EpigeneticsBarChart({ items }: EpigeneticsBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const processedData = useMemo(() => {
    if (!items || items.length === 0) {
      return { chartData: null, legendData: [] };
    }

    const chartData = items
      .map((item) => ({
        name: item.header,
        value: extractNumericValue(item.value),
        fill: getActivityColor(item.activity),
        activity:
          typeof item.activity === "object" && item.activity?.props?.children
            ? String(item.activity.props.children)
            : typeof item.activity === "string"
              ? item.activity
              : "Unknown",
      }))
      .sort((a, b) => b.value - a.value);

    // Create legend data from unique activities
    const activityMap = new Map<string, string>();
    chartData.forEach((item) => {
      if (!activityMap.has(item.activity)) {
        activityMap.set(item.activity, item.fill);
      }
    });

    const legendData = Array.from(activityMap.entries()).map(
      ([activity, color]) => ({
        value: activity,
        type: "rect" as const,
        color: color,
      }),
    );

    return { chartData, legendData };
  }, [items]);

  const handleExport = () => {
    exportChartAsPNG(chartRef, "chromatin-landscape");
  };

  if (!processedData.chartData) {
    return <NoDataState categoryName="Chromatin Data" />;
  }

  const { chartData, legendData } = processedData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xl max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold text-sm text-gray-900 leading-tight">
            {label}
          </p>

          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data?.fill }}
            />
            <span className="text-xs font-medium text-gray-700">
              {data?.activity}
            </span>
          </div>

          <div className="pt-1 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Chromatin Score:</span>
              <span className="ml-2 text-sm font-mono font-bold text-gray-900">
                {payload[0]?.value?.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    if (!payload || !payload.length) return null;

    return (
      <div className="flex flex-wrap justify-center gap-4 mt-8">
        {legendData.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div ref={chartRef}>
      <Card className={cn("w-full")}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chromatin Landscape</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={550}>
            <RechartsBarChart
              data={chartData}
              margin={CHART_MARGINS.withBothLabels}
              barCategoryGap={8}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: CHART_THEME.axis.fontSize }}
                stroke={CHART_THEME.axis.stroke}
                tickFormatter={(value) => trimLabel(value, 12)}
                angle={-45}
                textAnchor="end"
                height={Math.abs(-45) > 45 ? 60 : 40}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: CHART_THEME.axis.fontSize }}
                stroke={CHART_THEME.axis.stroke}
                label={{
                  value: "PHRED Epigenetics Score",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    textAnchor: "middle",
                    fontSize: CHART_THEME.axis.fontSize,
                    fill: CHART_THEME.axis.stroke,
                  },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
