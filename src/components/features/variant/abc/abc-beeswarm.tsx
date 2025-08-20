"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { scaleLinear, scaleBand } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { Group } from "@visx/group";
import { Circle } from "@visx/shape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableRangeFilter } from "@/components/ui/data-table-range-filter";
import { DataTableSingleSelectFilter } from "@/components/ui/data-table-single-select-filter";
import { Search, X } from "lucide-react";
import type { ABCScore } from "@/lib/variant/abc/api";

interface ABCBeeswarmProps {
  data: ABCScore[];
  title?: string;
  height?: number;
}

interface BeeswarmPoint {
  x: number;
  y: number;
  tissue: string;
  item: ABCScore;
  isSignificant: boolean;
}

interface BeeswarmVisualizationProps {
  data: BeeswarmPoint[];
  tissues: string[];
  height: number;
  maxScore: number;
  significanceThreshold: number;
}

interface TooltipData {
  x: number;
  y: number;
  point: BeeswarmPoint;
  visible: boolean;
}

function CustomTooltip({
  tooltip,
  tissueColor,
}: {
  tooltip: TooltipData;
  tissueColor: (tissue: string, isSignificant: boolean) => string;
}) {
  if (!tooltip.visible) return null;

  return (
    <div
      className="absolute pointer-events-none z-50 bg-background border border-border rounded-lg shadow-lg p-4 ml-6 mb-4"
      style={{
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="space-y-3 max-w-xs">
        <div className="flex items-center gap-3 text-sm">
          <div
            className="w-4 h-4 rounded-full border border-white"
            style={{
              backgroundColor: tissueColor(
                tooltip.point.tissue,
                tooltip.point.isSignificant,
              ),
            }}
          />
          <span className="font-semibold capitalize">
            {tooltip.point.tissue}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Gene:</span>
            <div className="font-semibold text-foreground">
              {tooltip.point.item.gene_name}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">ABC Score:</span>
            <div className="font-mono font-semibold text-foreground">
              {tooltip.point.item.abc_score.toFixed(3)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Distance:</span>
            <div className="font-mono font-semibold text-foreground">
              {(tooltip.point.item.distance / 1000).toFixed(0)}K bp
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Status:</span>
            <div
              className={`font-semibold ${
                tooltip.point.isSignificant ? "text-red-600" : "text-gray-500"
              }`}
            >
              {tooltip.point.isSignificant ? "Significant" : "Not significant"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BeeswarmVisualization({
  data,
  tissues,
  height,
  maxScore,
  significanceThreshold,
}: BeeswarmVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    point: {} as BeeswarmPoint,
    visible: false,
  });

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Responsive margins based on screen width
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const margin = {
    top: isMobile ? 10 : 40,
    right: isMobile ? 10 : isTablet ? 100 : 120,
    bottom: isMobile ? 10 : isTablet ? 100 : 120,
    left: isMobile ? 10 : isTablet ? 80 : 100,
  };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = scaleBand({
    range: [0, innerWidth],
    domain: tissues,
    padding: 0.1,
  });

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [0, maxScore],
  });

  const significanceY = yScale(significanceThreshold);

  // Define colors for different tissue categories
  const tissueColors = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // emerald
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#ec4899", // pink
    "#6b7280", // gray (fallback)
  ];

  const getTissueColor = (tissue: string, isSignificant: boolean) => {
    if (!isSignificant) return "#9ca3af"; // Always gray for non-significant
    const index = tissues.indexOf(tissue);
    return tissueColors[index % tissueColors.length];
  };

  const handleMouseEnter = (
    point: BeeswarmPoint,
    event: React.MouseEvent<SVGCircleElement>,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        point,
        visible: true,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div ref={containerRef} className="w-full relative">
      <svg width="100%" height={height} className="bg-transparent">
        <Group left={margin.left} top={margin.top}>
          {/* Grid lines */}
          {yScale.ticks(8).map((tick) => (
            <line
              key={tick}
              x1={0}
              y1={yScale(tick)}
              x2={innerWidth}
              y2={yScale(tick)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}

          {/* Significance threshold line */}
          <line
            x1={0}
            y1={significanceY}
            x2={innerWidth}
            y2={significanceY}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5,5"
          />

          {/* Significance label - hide on mobile */}
          {!isMobile && (
            <text
              x={innerWidth + 15}
              y={significanceY + 4}
              textAnchor="start"
              fontSize="11"
              fill="#ef4444"
              fontWeight="600"
              className="font-mono"
            >
              Significance: {significanceThreshold}
            </text>
          )}

          {/* Data points with dynamic sizing */}
          {data.map((point, index) => {
            const tissueIndex = tissues.indexOf(point.tissue);
            const bandWidth = xScale.bandwidth();
            const centerX = (xScale(point.tissue) || 0) + bandWidth / 2;
            const jitteredX =
              centerX + (point.x - tissueIndex) * bandWidth * 0.9;

            // Simple fixed sizing
            const radius = point.isSignificant
              ? isMobile
                ? 4
                : 5
              : isMobile
                ? 3.5
                : 4.5;

            return (
              <Circle
                key={index}
                cx={jitteredX}
                cy={yScale(point.y)}
                r={radius}
                fill={getTissueColor(point.tissue, point.isSignificant)}
                stroke="none"
                fillOpacity={point.isSignificant ? 0.8 : 0.6}
                className="hover:opacity-90 hover:stroke-2 hover:stroke-white cursor-pointer transition-all duration-200"
                onMouseEnter={(e) => handleMouseEnter(point, e)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* Axes - hide labels on mobile */}
          {!isMobile && (
            <AxisLeft
              scale={yScale}
              tickFormat={(value) => Number(value).toFixed(3)}
              tickLabelProps={{
                fontSize: 11,
                fill: "#6b7280",
                fontFamily: "ui-monospace, monospace",
              }}
              stroke="#e5e7eb"
            />
          )}

          {!isMobile && (
            <AxisBottom
              top={innerHeight}
              scale={xScale}
              tickLabelProps={{
                fontSize: 11,
                fill: "#374151",
                fontWeight: 500,
                angle: -45,
                textAnchor: "end",
              }}
              tickFormat={(value) => {
                const str = String(value);
                return str.length > 12 ? str.substring(0, 10) + "..." : str;
              }}
              stroke="#e5e7eb"
            />
          )}

          {/* Axis labels - hide on mobile */}
          {!isMobile && (
            <>
              <text
                x={innerWidth / 2}
                y={innerHeight + 95}
                textAnchor="middle"
                fontSize="13"
                fill="#374151"
                fontWeight="600"
                className="font-semibold"
              >
                Tissue Types
              </text>

              <text
                x={-70}
                y={innerHeight / 2}
                textAnchor="middle"
                fontSize="13"
                fill="#374151"
                fontWeight="600"
                className="font-semibold"
                transform={`rotate(-90, -70, ${innerHeight / 2})`}
              >
                ABC Score
              </text>
            </>
          )}
        </Group>
      </svg>

      {/* Custom React Tooltip */}
      <CustomTooltip tooltip={tooltip} tissueColor={getTissueColor} />
    </div>
  );
}

export function ABCBeeswarm({
  data,
  title = "ABC Links",
  height = 600,
}: ABCBeeswarmProps) {
  const [searchGene, setSearchGene] = useState("");
  const [selectedTissues, setSelectedTissues] = useState<string[]>([]);
  const [scoreRange, setScoreRange] = useState<[number, number] | undefined>(
    undefined,
  );
  const [selectedThreshold, setSelectedThreshold] = useState<
    string | undefined
  >("0.02");
  const [maxTissues] = useState(8);

  const allTissues = useMemo(() => {
    const tissueCounts = data.reduce(
      (acc, d) => {
        acc[d.tissue] = (acc[d.tissue] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(tissueCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tissue, count]) => ({ name: tissue, count }));
  }, [data]);

  const minScore = Math.min(...data.map((d) => d.abc_score));
  const maxScore = Math.max(...data.map((d) => d.abc_score));

  const tissueOptions = useMemo(
    () =>
      allTissues.map((tissue) => ({
        label: `${tissue.name} (${tissue.count})`,
        value: tissue.name,
      })),
    [allTissues],
  );

  const thresholdOptions = useMemo(() => {
    const baseOptions = [0.005, 0.01, 0.02, 0.03, 0.05];
    const additionalOptions = [];
    for (let i = 0.075; i <= Math.max(maxScore + 0.05, 0.2); i += 0.025) {
      additionalOptions.push(parseFloat(i.toFixed(3)));
    }

    const allOptions = [...baseOptions, ...additionalOptions].sort(
      (a, b) => a - b,
    );
    return allOptions.map((value) => ({
      label: value.toString(),
      value: value.toString(),
    }));
  }, [maxScore]);

  const significanceThreshold = selectedThreshold
    ? parseFloat(selectedThreshold)
    : 0.02;

  const displayTissues = useMemo(() => {
    if (selectedTissues.length > 0) {
      return allTissues.filter((t) => selectedTissues.includes(t.name));
    }
    return allTissues.slice(0, maxTissues);
  }, [allTissues, selectedTissues, maxTissues]);

  const plotData = useMemo(() => {
    const tissueNames =
      selectedTissues.length > 0
        ? selectedTissues
        : displayTissues.map((t) => t.name);
    let filtered = data.filter((d) => tissueNames.includes(d.tissue));

    if (searchGene) {
      filtered = filtered.filter((d) =>
        d.gene_name.toLowerCase().includes(searchGene.toLowerCase()),
      );
    }

    if (scoreRange) {
      filtered = filtered.filter(
        (d) => d.abc_score >= scoreRange[0] && d.abc_score <= scoreRange[1],
      );
    }

    // Group by tissue and limit per tissue
    const tissueGroups: Record<string, ABCScore[]> = {};
    filtered.forEach((item) => {
      if (!tissueGroups[item.tissue]) tissueGroups[item.tissue] = [];
      tissueGroups[item.tissue].push(item);
    });

    // Limit points per tissue and sort by significance
    Object.keys(tissueGroups).forEach((tissue) => {
      if (tissueGroups[tissue].length > 100) {
        tissueGroups[tissue] = tissueGroups[tissue]
          .sort((a, b) => b.abc_score - a.abc_score)
          .slice(0, 100);
      }
    });

    return tissueGroups;
  }, [data, displayTissues, searchGene, selectedTissues, scoreRange]);

  // Generate beeswarm positions with proper jittering like GWAS example
  const beeswarmData = useMemo(() => {
    const allPoints: BeeswarmPoint[] = [];

    displayTissues.forEach((tissue, tissueIndex) => {
      const tissueData = plotData[tissue.name] || [];

      if (tissueData.length === 0) return;

      // Apply jittering similar to GWAS example
      const tissuePoints: BeeswarmPoint[] = tissueData.map((item) => {
        // Create deterministic but pseudo-random jitter based on item properties
        const seed = (item.gene_name + item.abc_score.toString())
          .split("")
          .reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0);

        // Use seeded random for consistent positioning
        const random1 = Math.abs(Math.sin(seed * 12.9898)) % 1;
        const random2 = Math.abs(Math.sin(seed * 78.233)) % 1;

        // Apply jittering with controlled spread
        const xSpread = 0.35; // Maximum horizontal spread
        const ySpread = Math.max(0.002, maxScore * 0.008); // Adaptive Y spread based on data range

        const xJitter = (random1 - 0.5) * xSpread;
        const yJitter = (random2 - 0.5) * ySpread;

        return {
          x: tissueIndex + xJitter,
          y: item.abc_score + yJitter,
          tissue: tissue.name,
          item,
          isSignificant: item.abc_score >= significanceThreshold,
        };
      });

      allPoints.push(...tissuePoints);
    });

    return allPoints;
  }, [plotData, displayTissues, significanceThreshold, maxScore]);

  const TissueFilter = () => (
    <DataTableFacetedFilter
      column={
        {
          getFilterValue: () => selectedTissues,
          setFilterValue: (value: string[] | undefined) =>
            setSelectedTissues(value || []),
          getFacetedUniqueValues: () =>
            new Map(allTissues.map((t) => [t.name, t.count])),
        } as any
      }
      title="Tissues"
      options={tissueOptions}
    />
  );

  const ThresholdFilter = () => (
    <DataTableSingleSelectFilter
      column={{
        getFilterValue: () => selectedThreshold,
        setFilterValue: (value: string | undefined) =>
          setSelectedThreshold(value || "0.02"),
      }}
      title="Threshold"
      options={thresholdOptions}
    />
  );

  const scoreRangeColumn = {
    getFilterValue: () => scoreRange,
    setFilterValue: (value: [number, number] | undefined) =>
      setScoreRange(value),
  };

  const hasActiveFilters =
    selectedTissues.length > 0 ||
    scoreRange !== undefined ||
    selectedThreshold !== "0.02";

  const resetFilters = () => {
    setSelectedTissues([]);
    setScoreRange(undefined);
    setSelectedThreshold("0.02");
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-sm text-muted-foreground">
            {beeswarmData.length} connections across {displayTissues.length}{" "}
            tissues
          </div>
        </div>

        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search genes..."
              value={searchGene}
              onChange={(e) => setSearchGene(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchGene && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                onClick={() => setSearchGene("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center space-x-2">
            <TissueFilter />
            <DataTableRangeFilter
              column={scoreRangeColumn}
              title="ABC Score"
              min={minScore}
              max={maxScore}
              step={0.0001}
              formatValue={(v) => {
                if (Math.abs(v) < 0.0001 && v !== 0) {
                  return v.toExponential(2);
                }
                return parseFloat(v.toFixed(4)).toString();
              }}
            />
            <ThresholdFilter />
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
        </div>
      </CardHeader>

      <CardContent>
        {beeswarmData.length > 0 ? (
          <BeeswarmVisualization
            data={beeswarmData}
            tissues={displayTissues.map((t) => t.name)}
            height={height}
            maxScore={Math.max(maxScore, 0.2)}
            significanceThreshold={significanceThreshold}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No data to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
