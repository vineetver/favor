"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { GwasScatterTable } from "@/components/features/variant/gwas/gwas-scatter-table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableRangeFilter } from "@/components/ui/data-table-range-filter";
import { DataTableSingleSelectFilter } from "@/components/ui/data-table-single-select-filter";
import { X } from "lucide-react";
import type { GWAS } from "@/lib/variant/gwas/api";
import type {
  GwasTooltipData,
  ChartDimensions,
} from "@/lib/variant/gwas/types";
import {
  processGwasDataForChart,
  getCategoryColor,
} from "@/lib/variant/gwas/utils";
import {
  formatPValue,
  formatFrequency,
  formatMlogPValue,
  truncateText,
  formatEffectSize,
} from "@/lib/variant/gwas/formatting";
import { GWAS_CONSTANTS } from "@/lib/variant/gwas/constants";

interface ScatterChartDiseaseProps {
  data: GWAS[];
  targetEfoLevel?: number;
  jitterAmount?: number;
  dimensions?: Partial<ChartDimensions>;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GwasTooltipData }>;
}

const CustomTooltip = React.memo<
  TooltipProps & { significanceThreshold: number }
>(function CustomTooltip({ active, payload, significanceThreshold }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const isSignificant = data.yValue >= significanceThreshold;

  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 max-w-xs">
      <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
        {data.rsid}
        {isSignificant && (
          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
            Significant
          </span>
        )}
        {data.isAboveCutoff && (
          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
            Above cutoff
          </span>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Trait:</span>{" "}
          {truncateText(data.gwas_disease_trait, 40)}
        </div>
        <div>
          <span className="text-muted-foreground">Category:</span>{" "}
          {data.category}
        </div>
        <div>
          <span className="text-muted-foreground">P-value:</span>{" "}
          {formatPValue(data.gwas_p_value)}
        </div>
        <div>
          <span className="text-muted-foreground">-log₁₀P:</span>{" "}
          {formatMlogPValue(data.originalYValue || data.yValue)}
        </div>
        <div>
          <span className="text-muted-foreground">RAF:</span>{" "}
          {formatFrequency(data.gwas_risk_allele_frequency)}
        </div>
        {data.gwas_or_or_beta && (
          <div>
            <span className="text-muted-foreground">Effect size:</span>{" "}
            {formatEffectSize(data.gwas_or_or_beta)}
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Gene:</span>{" "}
          {data.gwas_mapped_gene || "N/A"}
        </div>
      </div>
    </div>
  );
});

const ChartLegend = React.memo(function ChartLegend({
  threshold,
}: {
  threshold: number;
}) {
  return (
    <div className="bg-muted/20 rounded-lg p-3 border">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-70"></div>
            <span>Above threshold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Below threshold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-blue-500 opacity-80"></div>
            <span>Extremely significant (-log₁₀P {">"} 80)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg width="16" height="12" className="shrink-0">
            <line
              x1="0"
              y1="6"
              x2="16"
              y2="6"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="2,2"
            />
          </svg>
          <span>Threshold: {threshold}</span>
        </div>
      </div>
    </div>
  );
});

export function GwasScatterChart({
  data,
  targetEfoLevel = 3,
  jitterAmount = GWAS_CONSTANTS.DEFAULT_JITTER_AMOUNT,
  dimensions,
}: ScatterChartDiseaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [hoveredRow] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pValueRange, setPValueRange] = useState<[number, number] | undefined>(
    undefined,
  );
  const [selectedSignificanceThreshold, setSelectedSignificanceThreshold] =
    useState<string | undefined>("7.3");

  const chartDimensions: ChartDimensions = {
    width: "100%",
    height: 600,
    margin: { top: 5, right: 15, bottom: 50, left: 0 },
    ...dimensions,
  };

  const chartDataMemo = useMemo(() => {
    if (!data?.length) return { processed: [], categories: [] };
    return processGwasDataForChart(data, targetEfoLevel, {
      amount: jitterAmount,
      xSpread: 0.9,
      ySpread: 0.15,
    });
  }, [data, targetEfoLevel, jitterAmount]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    let filtered = chartDataMemo.processed;

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((d) =>
        selectedCategories.includes(d.category),
      );
    }

    // P-value range filter (on -log10P values)
    if (pValueRange) {
      filtered = filtered.filter((d) => {
        const mlogP = parseFloat(d.gwas_p_value_mlog);
        return mlogP >= pValueRange[0] && mlogP <= pValueRange[1];
      });
    }

    return filtered;
  }, [chartDataMemo.processed, selectedCategories, pValueRange]);

  const chartData = filteredData;
  const dynamicCategories = chartDataMemo.categories;

  const yAxisMax = GWAS_CONSTANTS.Y_AXIS_MAX;

  const selectedCategoryData = useMemo(() => {
    return selectedCategory
      ? chartData.filter((d) => d.category === selectedCategory)
      : [];
  }, [selectedCategory, chartData]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    chartData.forEach((d) => {
      counts.set(d.category, (counts.get(d.category) || 0) + 1);
    });
    return counts;
  }, [chartData]);

  const categoryButtonStyles = useMemo(() => {
    const styles = new Map<string, React.CSSProperties>();
    dynamicCategories.forEach((category) => {
      const categoryColor = getCategoryColor(category);
      styles.set(category, {
        backgroundColor:
          selectedCategory === category ? categoryColor : "transparent",
        borderColor: categoryColor,
        color: selectedCategory === category ? "white" : categoryColor,
      });
    });
    return styles;
  }, [dynamicCategories, selectedCategory]);

  const handleCategoryClick = useCallback(
    (categoryIndex: number) => {
      const category = dynamicCategories[categoryIndex];
      setSelectedCategory((prev) => (prev === category ? null : category));
    },
    [dynamicCategories],
  );

  const handlePointClick = useCallback(
    (categoryIndex: number, pointUniqueKey?: string) => {
      const category = dynamicCategories[categoryIndex];
      setSelectedCategory(category);
      setSelectedPoint(pointUniqueKey || null);
    },
    [dynamicCategories],
  );

  const handlePointHover = useCallback((key: string | null) => {
    setHoveredPoint(key);
  }, []);

  // Filter options and utilities
  const allCategories = useMemo(() => {
    const categoryCounts = chartDataMemo.processed.reduce(
      (acc, d) => {
        acc[d.category] = (acc[d.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ name: category, count }));
  }, [chartDataMemo.processed]);

  const minMLogP = Math.min(
    ...chartDataMemo.processed.map((d) => parseFloat(d.gwas_p_value_mlog)),
  );
  const maxMLogP = Math.max(
    ...chartDataMemo.processed.map((d) => parseFloat(d.gwas_p_value_mlog)),
  );

  const categoryOptions = useMemo(
    () =>
      allCategories.map((cat) => ({
        label: `${cat.name} (${cat.count})`,
        value: cat.name,
      })),
    [allCategories],
  );

  const thresholdOptions = useMemo(() => {
    const options = [5, 7.3, 10, 15, 20, 30, 50, 80];
    return options.map((value) => ({
      label: value.toString(),
      value: value.toString(),
    }));
  }, []);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    pValueRange !== undefined ||
    selectedSignificanceThreshold !== "7.3";

  const resetFilters = () => {
    setSelectedCategories([]);
    setPValueRange(undefined);
    setSelectedSignificanceThreshold("7.3");
  };

  return (
    <div className="space-y-3 lg:space-y-4 relative">
      {/* Chart Legend */}
      <ChartLegend
        threshold={
          selectedSignificanceThreshold
            ? parseFloat(selectedSignificanceThreshold)
            : GWAS_CONSTANTS.GENOME_WIDE_SIGNIFICANCE_THRESHOLD
        }
      />

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters</h3>
            <div className="text-sm text-muted-foreground">
              {chartData.length} of {chartDataMemo.processed.length}{" "}
              associations
            </div>
          </div>

          <div className="flex flex-wrap items-center space-x-2">
            <DataTableFacetedFilter
              column={
                {
                  getFilterValue: () => selectedCategories,
                  setFilterValue: (value: string[] | undefined) =>
                    setSelectedCategories(value || []),
                  getFacetedUniqueValues: () =>
                    new Map(allCategories.map((c) => [c.name, c.count])),
                } as any
              }
              title="Categories"
              options={categoryOptions}
            />
            <DataTableRangeFilter
              column={
                {
                  getFilterValue: () => pValueRange,
                  setFilterValue: (value: [number, number] | undefined) =>
                    setPValueRange(value),
                } as any
              }
              title="-log₁₀P"
              min={minMLogP}
              max={maxMLogP}
              step={0.1}
              formatValue={(v) => v.toFixed(1)}
            />
            <DataTableSingleSelectFilter
              column={
                {
                  getFilterValue: () => selectedSignificanceThreshold,
                  setFilterValue: (value: string | undefined) =>
                    setSelectedSignificanceThreshold(value || "7.3"),
                } as any
              }
              title="Threshold"
              options={thresholdOptions}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <ResponsiveContainer
        width={chartDimensions.width}
        height={chartDimensions.height}
        className="outline-none"
      >
        <ScatterChart margin={chartDimensions.margin}>
          {/* Significance threshold line */}
          <ReferenceLine
            y={
              selectedSignificanceThreshold
                ? parseFloat(selectedSignificanceThreshold)
                : GWAS_CONSTANTS.GENOME_WIDE_SIGNIFICANCE_THRESHOLD
            }
            stroke={GWAS_CONSTANTS.COLORS.GENOME_WIDE_SIGNIFICANT}
            strokeDasharray="4 4"
            strokeWidth={2}
            label={{
              value: `Threshold: ${selectedSignificanceThreshold || GWAS_CONSTANTS.GENOME_WIDE_SIGNIFICANCE_THRESHOLD}`,
              position: "insideTopRight",
              style: { fill: "#ef4444", fontSize: 10, fontWeight: 500 },
            }}
          />

          <XAxis
            type="number"
            dataKey="xValue"
            domain={[-0.5, dynamicCategories.length - 0.5]}
            ticks={dynamicCategories.map((_, i) => i)}
            tickFormatter={(tick) => {
              const category = dynamicCategories[tick] ?? "";
              // Truncate long category names on mobile
              return category.length > 8
                ? `${category.slice(0, 6)}...`
                : category;
            }}
            angle={-35}
            textAnchor="end"
            tick={{ fontSize: 11 }}
            label={{
              value: "Categories",
              position: "insideBottom",
              offset: -5,
              style: { fontSize: 10, fill: "#666" },
            }}
            onClick={(data) => {
              if (typeof data?.value === "number") {
                handleCategoryClick(Math.round(data.value));
              }
            }}
            style={{ cursor: "pointer" }}
          />
          <YAxis
            type="number"
            dataKey="yValue"
            domain={[0, yAxisMax]}
            tick={{ fontSize: 10 }}
            label={{
              value: "-log₁₀P",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 10, fill: "#666" },
            }}
          />
          <Tooltip
            content={
              <CustomTooltip
                significanceThreshold={
                  selectedSignificanceThreshold
                    ? parseFloat(selectedSignificanceThreshold)
                    : GWAS_CONSTANTS.GENOME_WIDE_SIGNIFICANCE_THRESHOLD
                }
              />
            }
          />
          <Scatter
            name="GWAS Data"
            data={chartData}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const currentThreshold = selectedSignificanceThreshold
                ? parseFloat(selectedSignificanceThreshold)
                : GWAS_CONSTANTS.GENOME_WIDE_SIGNIFICANCE_THRESHOLD;
              const isBelowThreshold = payload.yValue < currentThreshold;
              const categoryColor = isBelowThreshold
                ? "#9ca3af"
                : getCategoryColor(payload.category);

              const isHovered =
                hoveredPoint === payload.uniqueKey ||
                hoveredRow === payload.uniqueKey;
              const isSelected = selectedPoint === payload.uniqueKey;
              const isInUnselectedCategory =
                selectedCategory && selectedCategory !== payload.category;

              const sharedProps = {
                onClick: () => {
                  const categoryIndex = dynamicCategories.indexOf(
                    payload.category,
                  );
                  if (categoryIndex !== -1) {
                    handlePointClick(categoryIndex, payload.uniqueKey);
                  }
                },
                onMouseEnter: () => handlePointHover(payload.uniqueKey),
                onMouseLeave: () => handlePointHover(null),
              };

              const getStroke = () =>
                isSelected ? "#000" : isHovered ? "#666" : "#fff";
              const getStrokeWidth = (isAboveCutoff: boolean) => {
                if (isSelected) return isAboveCutoff ? 3 : 4;
                if (isHovered) return isAboveCutoff ? 1.5 : 2;
                return isAboveCutoff ? 0.5 : 1;
              };
              const getOpacity = () => {
                if (isInUnselectedCategory) return 0.4;
                if (selectedPoint && !isSelected) return 0.3;
                return payload.isAboveCutoff ? 0.8 : 0.6;
              };
              const getFilter = () =>
                isSelected
                  ? "drop-shadow(0 0 6px rgba(0,0,0,0.5))"
                  : isHovered
                    ? "drop-shadow(0 0 4px rgba(0,0,0,0.3))"
                    : "none";

              const commonStyle = {
                cursor: "pointer",
                opacity: getOpacity(),
                filter: getFilter(),
                transition: "opacity 0.2s ease, filter 0.2s ease",
              };

              if (payload.isAboveCutoff) {
                const arrowSize = 6;
                const path = `M${cx - arrowSize},${cy + 4} L${cx},${cy - 7} L${cx + arrowSize},${cy + 4} Z`;
                return (
                  <path
                    d={path}
                    fill={categoryColor}
                    stroke={getStroke()}
                    strokeWidth={getStrokeWidth(true)}
                    style={commonStyle}
                    {...sharedProps}
                  />
                );
              }

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={payload.radius || 4}
                  fill={categoryColor}
                  stroke={getStroke()}
                  strokeWidth={getStrokeWidth(false)}
                  style={commonStyle}
                  {...sharedProps}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Category buttons - Mobile optimized */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1 lg:gap-2">
          {dynamicCategories.map((category, index) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-2 h-auto"
              onClick={() => handleCategoryClick(index)}
              style={categoryButtonStyles.get(category)}
            >
              <span className="hidden sm:inline">{category}</span>
              <span className="sm:hidden">{category.slice(0, 6)}</span>
              <span className="ml-1">
                ({categoryCounts.get(category) || 0})
              </span>
            </Button>
          ))}
        </div>
        {selectedCategory && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs w-full sm:w-auto"
            onClick={() => {
              setSelectedCategory(null);
              setSelectedPoint(null);
            }}
          >
            Clear Selection
          </Button>
        )}
      </div>

      {selectedCategory && selectedCategoryData.length > 0 && (
        <GwasScatterTable
          data={selectedCategoryData}
          title={`${selectedCategoryData.length} variant${selectedCategoryData.length !== 1 ? "s" : ""} in ${selectedCategory}`}
          selectedRowId={selectedPoint}
          onRowClick={(row) => {
            setSelectedPoint(row.uniqueKey);
            setHoveredPoint(row.uniqueKey);
          }}
        />
      )}
    </div>
  );
}
