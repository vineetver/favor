"use client";

import { useMemo } from "react";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { FemaleFrequencyTable } from "@/components/features/variant/gender/female-frequency-table";
import { buildFemaleFrequencies } from "@/lib/variant/gnomad/utils";
import { FEMALE_CHART_CONFIG } from "@/lib/variant/gender/table-columns";
import type { Variant } from "@/lib/variant/types";
import type { GnomadData } from "@/lib/variant/gnomad/api";

interface FemaleDataDisplayProps {
  variant: Variant;
  exome: GnomadData | null;
  genome: GnomadData | null;
}

export function FemaleDataDisplay({
  variant,
  exome,
  genome,
}: FemaleDataDisplayProps) {
  const femaleFrequencies = useMemo(
    () => buildFemaleFrequencies(variant, exome, genome),
    [variant, exome, genome],
  );

  const validFrequencies = femaleFrequencies.filter(
    (freq) =>
      freq.female31 !== undefined ||
      freq.female41_exome !== undefined ||
      freq.female41_genome !== undefined,
  );

  const chartData = useMemo(() => {
    return validFrequencies
      .map((freq) => ({
        population: freq.name,
        [FEMALE_CHART_CONFIG.keys[0]]: freq.female31 || 0,
        [FEMALE_CHART_CONFIG.keys[1]]: freq.female41_exome || 0,
        [FEMALE_CHART_CONFIG.keys[2]]: freq.female41_genome || 0,
      }))
      .filter(
        (item) =>
          (item[FEMALE_CHART_CONFIG.keys[0]] as number) > 0 ||
          (item[FEMALE_CHART_CONFIG.keys[1]] as number) > 0 ||
          (item[FEMALE_CHART_CONFIG.keys[2]] as number) > 0,
      );
  }, [validFrequencies]);

  if (validFrequencies.length === 0) {
    return (
      <NoDataState
        categoryName="Female Allele Frequency Data"
        description="No female-specific allele frequency data is available for this variant."
      />
    );
  }

  const tabs = [
    {
      id: "table",
      label: "Frequency Table",
      shortLabel: "Table",
      count: validFrequencies.length,
      content: <FemaleFrequencyTable data={validFrequencies} />,
    },
    {
      id: "visualization",
      label: "Visualization",
      shortLabel: "Chart",
      content:
        chartData.length > 0 ? (
          <BarChart
            data={chartData}
            keys={FEMALE_CHART_CONFIG.keys}
            indexBy="population"
            title={FEMALE_CHART_CONFIG.title}
            subtitle={FEMALE_CHART_CONFIG.subtitle}
            yLabel="Allele Frequency"
            xLabel=""
            height={550}
            margin={{ top: 5, right: 10, bottom: 30, left: 10 }}
            colors={FEMALE_CHART_CONFIG.colors}
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
