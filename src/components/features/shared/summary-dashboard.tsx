"use client";

import { BarChart } from "@/components/ui/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilteredItem } from "@/lib/annotations/types";
import { cn } from "@/lib/utils/general";
import {
  ACCESSIBLE_COLORS,
  generateColors,
  formatInteger,
  formatNumber as formatNumberUtil,
} from "@/components/ui/charts/utils";
import {
  genecodeComprehensiveCategoryCCode,
  ccreAnnotationCCode,
  genecodeCompExonicCategoryCCode,
} from "@/lib/utils/colors";

interface SummaryDashboardProps {
  data: FilteredItem[];
  totalVariants?: number;
  title?: string;
  className?: string;
}

export function SummaryDashboard({
  data,
  totalVariants: passedTotal,
  title = "Distribution Overview",
  className,
}: SummaryDashboardProps) {
  const totalVariants =
    passedTotal ??
    ((data?.find((item) => item.accessor === "total")?.value as number) || 0);

  // Convert Tailwind color names to hex values for charts
  const colorNameToHex: Record<string, string> = {
    blue: "#3b82f6",
    red: "#ef4444",
    green: "#10b981",
    indigo: "#6366f1",
    lime: "#84cc16",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    yellow: "#eab308",
    rose: "#f43f5e",
    sky: "#0ea5e9",
    orange: "#f97316",
    stone: "#78716c",
    amber: "#f59e0b",
    emerald: "#10b981",
    fuchsia: "#d946ef",
    violet: "#8b5cf6",
    purple: "#a855f7",
    pink: "#ec4899",
    gray: "#6b7280",
  };

  // Get category-specific color for known categories
  const getCategoryColor = (categoryName: string): string => {
    // Check for genecode comprehensive categories
    if (
      categoryName.match(
        /(exonic|UTR|intronic|downstream|intergenic|upstream|splicing)/i,
      )
    ) {
      const colorName = getCategoryColorName(categoryName, "genecode");
      return colorNameToHex[colorName] || ACCESSIBLE_COLORS[0];
    }

    // Check for CCRE categories
    if (categoryName.match(/(PLS|pELS|dELS|DNase|CTCF|CA|TF)/i)) {
      const colorName = getCategoryColorName(categoryName, "ccre");
      return colorNameToHex[colorName] || ACCESSIBLE_COLORS[0];
    }

    // Check for exonic subcategories
    if (
      categoryName.match(
        /(stopgain|stoploss|frameshift|synonymous|nonsynonymous)/i,
      )
    ) {
      const colorName = getCategoryColorName(categoryName, "exonic");
      return colorNameToHex[colorName] || ACCESSIBLE_COLORS[0];
    }

    // Default fallback - use accessible colors cycling
    const fallbackColors = ACCESSIBLE_COLORS;
    const index = Math.abs(categoryName.length) % fallbackColors.length;
    return fallbackColors[index];
  };

  // Helper to extract color name from category functions
  const getCategoryColorName = (categoryName: string, type: string): string => {
    if (type === "genecode") {
      if (categoryName.match(/(exonic)/i)) return "stone";
      if (categoryName.match(/(UTR)/i)) return "indigo";
      if (categoryName.match(/(intronic)/i)) return "lime";
      if (categoryName.match(/(downstream)/i)) return "teal";
      if (categoryName.match(/(intergenic)/i)) return "cyan";
      if (categoryName.match(/upstream/i)) return "sky";
      if (categoryName.match(/(splicing)/i)) return "yellow";
      return "amber";
    }

    if (type === "ccre") {
      if (categoryName.includes("PLS")) return "red";
      if (categoryName.includes("pELS")) return "orange";
      if (categoryName.includes("dELS")) return "yellow";
      if (categoryName.includes("DNase-H3K4me3")) return "pink";
      if (categoryName.includes("CA-CTCF")) return "blue";
      if (categoryName.includes("CA-H3K4me3")) return "orange";
      if (categoryName.includes("CTCF-Bound")) return "blue";
      if (categoryName.includes("CA-TF")) return "purple";
      if (categoryName.includes("TF")) return "pink";
      if (categoryName.includes("CA")) return "green";
      return "amber";
    }

    if (type === "exonic") {
      if (categoryName.includes("stopgain")) return "stone";
      if (categoryName.includes("stoploss")) return "rose";
      if (categoryName.includes("unknown")) return "indigo";
      if (categoryName.includes("nonframeshift substitution")) return "lime";
      if (categoryName.includes("synonymous SNV")) return "emerald";
      if (categoryName.includes("nonframeshift insertion")) return "teal";
      if (categoryName.includes("frameshift substitution")) return "yellow";
      if (categoryName.includes("frameshift deletion")) return "sky";
      if (categoryName.includes("frameshift insertion")) return "orange";
      if (categoryName.includes("nonframeshift deletion")) return "cyan";
      if (categoryName.includes("nonsynonymous SNV")) return "amber";
      return "red";
    }

    return "blue";
  };

  const filteredData =
    data?.filter(
      (item) =>
        typeof item.value === "number" &&
        item.value > 0 &&
        item.accessor !== "total",
    ) || [];

  const chartData = filteredData.map((item, index) => ({
    name: item.header,
    value: item.value as number,
    percentage:
      totalVariants > 0 ? ((item.value as number) / totalVariants) * 100 : 0,
    tooltip: item.tooltip,
    color: getCategoryColor(item.header),
  }));

  // Create colors array for the chart component
  const colors = chartData.map((item) => item.color);

  const sortedData = chartData.sort((a, b) => b.percentage - a.percentage);

  const topCategories = sortedData.slice(0, 3);

  return (
    <div className="space-y-6">
      <BarChart
        data={sortedData}
        keys={["value"]}
        indexBy="name"
        yLabel="Variant Count"
        height={500}
        margin={{ top: 20, right: 10, bottom: 50, left: 90 }}
        showLegend={false}
        colors={colors}
        formatYAxis={formatInteger}
        formatTooltipValue={formatInteger}
        tickAngle={-45}
      />

      {/* Legend Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="w-full max-w-full overflow-hidden">
            <div className="flex flex-wrap justify-center gap-3 px-2 mx-auto">
              {sortedData.map((category, index) => (
                <div
                  key={category.name}
                  className="flex items-center gap-2 text-sm flex-shrink-0"
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-muted-foreground truncate max-w-40">
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
