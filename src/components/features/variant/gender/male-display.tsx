"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { MaleFrequencyTable } from "./male-frequency-table";
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
          <MaleFrequencyTable data={validFrequencies} />
        </TabsContent>

        <TabsContent value="visualization" className="mt-4">
          {chartData.length > 0 && (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}