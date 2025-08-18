"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { FemaleFrequencyTable } from "./female-frequency-table";
import { buildFemaleFrequencies } from "@/lib/variant/gnomad/utils";
import { FEMALE_CHART_CONFIG } from "@/lib/variant/gender/table-columns";
import type { Variant } from "@/lib/variant/api";
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="h-12 p-1 bg-primary/10 border border-primary/20 rounded-lg">
          <TabsTrigger
            value="table"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Frequency Table</span>
            {validFrequencies.length > 0 && (
              <Badge className="text-xs font-mono ml-1 flex-shrink-0 bg-primary/20 text-primary-foreground border-primary/30">
                {validFrequencies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="visualization"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Visualization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <FemaleFrequencyTable data={validFrequencies} />
        </TabsContent>

        <TabsContent value="visualization" className="mt-4">
          {chartData.length > 0 && (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}