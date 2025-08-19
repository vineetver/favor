"use client";

import { useMemo } from "react";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { AncestryFrequencyTable } from "./ancestry-frequency-table";
import { buildAncestryFrequencies } from "@/lib/variant/gnomad/utils";
import { ANCESTRY_CHART_CONFIG } from "@/lib/variant/ancestry/table-columns";
import type { Variant } from "@/lib/variant/api";
import type { GnomadData } from "@/lib/variant/gnomad/api";

interface AncestryDisplayProps {
  variant: Variant;
  exome: GnomadData | null;
  genome: GnomadData | null;
}

export function AncestryDisplay({
  variant,
  exome,
  genome,
}: AncestryDisplayProps) {
  const ancestryFrequencies = useMemo(
    () => buildAncestryFrequencies(variant, exome, genome),
    [variant, exome, genome],
  );

  const validFrequencies = ancestryFrequencies.filter(
    (freq) =>
      freq.g1000 !== undefined ||
      freq.gnomad31 !== undefined ||
      freq.gnomad41_exome !== undefined ||
      freq.gnomad41_genome !== undefined,
  );

  const chartData = useMemo(() => {
    return validFrequencies
      .map((freq) => ({
        population: freq.name,
        [ANCESTRY_CHART_CONFIG.keys[0]]: freq.g1000 || 0,
        [ANCESTRY_CHART_CONFIG.keys[1]]: freq.gnomad31 || 0,
        [ANCESTRY_CHART_CONFIG.keys[2]]: freq.gnomad41_exome || 0,
        [ANCESTRY_CHART_CONFIG.keys[3]]: freq.gnomad41_genome || 0,
      }))
      .filter(
        (item) =>
          (item[ANCESTRY_CHART_CONFIG.keys[0]] as number) > 0 ||
          (item[ANCESTRY_CHART_CONFIG.keys[1]] as number) > 0 ||
          (item[ANCESTRY_CHART_CONFIG.keys[2]] as number) > 0 ||
          (item[ANCESTRY_CHART_CONFIG.keys[3]] as number) > 0,
      );
  }, [validFrequencies]);

  if (validFrequencies.length === 0) {
    return (
      <NoDataState
        categoryName="Ancestry Frequency Data"
        description="No ancestry-specific allele frequency data is available for this variant."
      />
    );
  }

  const tabs = [
    {
      id: "table",
      label: "Frequency Table",
      shortLabel: "Table",
      count: validFrequencies.length,
      content: <AncestryFrequencyTable data={validFrequencies} />
    },
    {
      id: "visualization", 
      label: "Visualization",
      shortLabel: "Chart",
      content: chartData.length > 0 ? (
        <BarChart
          data={chartData}
          keys={ANCESTRY_CHART_CONFIG.keys}
          indexBy="population"
          title={ANCESTRY_CHART_CONFIG.title}
          subtitle={ANCESTRY_CHART_CONFIG.subtitle}
          yLabel="Allele Frequency"
          xLabel=""
          height={550}
          margin={{ top: 5, right: 10, bottom: 30, left: 10 }}
          colors={ANCESTRY_CHART_CONFIG.colors}
          showLegend={true}
          borderRadius={8}
        />
      ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} variant="flat" />
    </div>
  );
}
