"use client";

import { useMemo } from "react";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { DataGrid } from "@/components/ui/data-grid";
import { ScatterChart } from "@/components/ui/charts/scatter-chart";
import { ABCBeeswarm } from "./abc-beeswarm";
import { NoDataState } from "@/components/ui/error-states";
import { abcPeaksColumns, abcScoreColumns } from "@/lib/variant/abc/table-columns";
import type { ABCPeaks, ABCScore } from "@/lib/variant/abc/api";

interface CatlasDisplayProps {
  peaks: ABCPeaks[];
  scores: ABCScore[];
}

export function CatlasDisplay({ peaks, scores }: CatlasDisplayProps) {
  const peaksChartData = useMemo(() => {
    const processed = peaks.map(peak => ({
      ...peak,
      neg_log_p: -Math.log10(peak.p_value),
      region: `${peak.chromosome}:${peak.start_position}-${peak.end_position}`,
    }));

    // If too many points, sample top ones by significance
    if (processed.length > 1000) {
      return processed
        .sort((a, b) => b.neg_log_p - a.neg_log_p)
        .slice(0, 1000);
    }
    return processed;
  }, [peaks]);

  const tissueOptions = useMemo(() => {
    const tissueSet = new Set([...peaks.map(p => p.tissue), ...scores.map(s => s.tissue)]);
    const allTissues = Array.from(tissueSet);
    return allTissues.map(tissue => ({
      label: tissue.charAt(0).toUpperCase() + tissue.slice(1),
      value: tissue,
    }));
  }, [peaks, scores]);

  const formatPValue = (value: number) => {
    return value < 0.001 ? value.toExponential(2) : value.toFixed(4);
  };

  const formatScore = (value: number) => value.toFixed(3);

  if (peaks.length === 0 && scores.length === 0) {
    return (
      <NoDataState
        categoryName="ABC Data"
        description="No ABC peaks or scores data is available for this variant."
      />
    );
  }

  const tabs = [
    {
      id: "peaks-table",
      label: "Peaks Table",
      shortLabel: "PT",
      count: peaks.length,
      content: peaks.length > 0 ? (
        <DataGrid
          columns={abcPeaksColumns}
          data={peaks}
          title="ABC Peaks"
          description="Enhancer peaks with ABC activity predictions"
          searchPlaceholder="Search by tissue..."
          facetedFilters={[
            {
              columnId: "tissue",
              title: "Tissue",
              options: tissueOptions,
            },
          ]}
          emptyState={{
            title: "No peaks found",
            description: "No ABC peaks match your current filters.",
            dataType: "peaks",
          }}
        />
      ) : (
        <NoDataState
          title="No ABC peaks data"
          description="No ABC peaks data is available for this variant."
          categoryName="peaks"
        />
      )
    },
    {
      id: "peaks-chart",
      label: "Peaks Chart",
      shortLabel: "PC",
      content: peaksChartData.length > 0 ? (
        <ScatterChart
          data={peaksChartData}
          xDataKey="signal_value"
          yDataKey="neg_log_p"
          colorByKey="tissue"
          title={`ABC Peaks: Signal Strength vs Significance${peaks.length > 1000 ? ` (top 1,000 of ${peaks.length})` : ''}`}
          xLabel="Signal Value"
          yLabel="-log₁₀(P-value)"
          height={500}
          formatXAxis={formatScore}
          formatYAxis={(value) => value.toFixed(1)}
          formatTooltipValue={(value, name) => {
            if (name === "p_value") return formatPValue(value);
            if (name === "signal_value" || name === "abc_score") return formatScore(value);
            return value;
          }}
          dotSize={8}
          minDotSize={6}
          maxDotSize={14}
          sizeKey="signal_value"
        />
      ) : (
        <NoDataState
          title="No peaks chart data"
          description="No ABC peaks data is available for visualization."
          categoryName="peaks"
        />
      )
    },
    {
      id: "links-table",
      label: "Links Table", 
      shortLabel: "LT",
      count: scores.length,
      content: scores.length > 0 ? (
        <DataGrid
          columns={abcScoreColumns}
          data={scores}
          title="ABC Links"
          description="Enhancer-promoter links with ABC scores"
          searchPlaceholder="Search by gene name..."
          facetedFilters={[
            {
              columnId: "tissue",
              title: "Tissue",
              options: tissueOptions,
            },
          ]}
          emptyState={{
            title: "No ABC links found",
            description: "No ABC enhancer-promoter links match your current filters.",
            dataType: "links",
          }}
        />
      ) : (
        <NoDataState
          title="No ABC links data"
          description="No ABC enhancer-promoter links data is available for this variant."
          categoryName="links"
        />
      )
    },
    {
      id: "links-chart",
      label: "Links Chart",
      shortLabel: "LC",
      content: scores.length > 0 ? (
        <ABCBeeswarm
          data={scores}
          title="ABC Enhancer-Promoter Links"
          height={500}
        />
      ) : (
        <NoDataState
          title="No links chart data"
          description="No ABC links data is available for visualization."
          categoryName="links"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} variant="flat" />
    </div>
  );
}