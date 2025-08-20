"use client";

import { useMemo } from "react";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { MaleFrequencyTable } from "@/components/features/variant/gender/male-frequency-table";
import { buildMaleFrequencies } from "@/lib/variant/gnomad/utils";
import { MALE_CHART_CONFIG } from "@/lib/variant/gender/table-columns";
import type { Variant } from "@/lib/variant/api";
import type { GnomadData } from "@/lib/variant/gnomad/api";

interface MaleDataDisplayProps {
  variant: Variant;
  exome: GnomadData | null;
  genome: GnomadData | null;
}

export function MaleDataDisplay({
  variant,
  exome,
  genome,
}: MaleDataDisplayProps) {
  const maleFrequencies = useMemo(
    () => buildMaleFrequencies(variant, exome, genome),
    [variant, exome, genome],
  );

  const validFrequencies = maleFrequencies.filter(
    (freq) =>
      freq.male31 !== undefined ||
      freq.male41_exome !== undefined ||
      freq.male41_genome !== undefined,
  );

  const chartData = useMemo(() => {
    return validFrequencies
      .map((freq) => ({
        population: freq.name,
        [MALE_CHART_CONFIG.keys[0]]: freq.male31 || 0,
        [MALE_CHART_CONFIG.keys[1]]: freq.male41_exome || 0,
        [MALE_CHART_CONFIG.keys[2]]: freq.male41_genome || 0,
      }))
      .filter(
        (item) =>
          (item[MALE_CHART_CONFIG.keys[0]] as number) > 0 ||
          (item[MALE_CHART_CONFIG.keys[1]] as number) > 0 ||
          (item[MALE_CHART_CONFIG.keys[2]] as number) > 0,
      );
  }, [validFrequencies]);

  if (validFrequencies.length === 0) {
    return (
      <NoDataState
        categoryName="Male Allele Frequency Data"
        description="No male-specific allele frequency data is available for this variant."
      />
    );
  }

  const tabs = [
    {
      id: "table",
      label: "Frequency Table",
      shortLabel: "Table",
      count: validFrequencies.length,
      content: <MaleFrequencyTable data={validFrequencies} />,
    },
    {
      id: "visualization",
      label: "Visualization",
      shortLabel: "Chart",
      content:
        chartData.length > 0 ? (
          <BarChart
            data={chartData}
            keys={MALE_CHART_CONFIG.keys}
            indexBy="population"
            title={MALE_CHART_CONFIG.title}
            subtitle={MALE_CHART_CONFIG.subtitle}
            yLabel="Allele Frequency"
            xLabel=""
            height={550}
            margin={{ top: 5, right: 10, bottom: 30, left: 10 }}
            colors={MALE_CHART_CONFIG.colors}
            showLegend={true}
            borderRadius={8}
          />
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} variant="flat" />
    </div>
  );
}
