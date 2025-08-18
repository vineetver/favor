"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { NoDataState } from "@/components/ui/error-states";
import { AncestryFrequencyTable } from "./ancestry-frequency-table";
import { buildAncestryFrequencies } from "@/lib/variant/gnomad/utils";
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
        "1000G Phase 3": freq.g1000 || 0,
        "gnomAD v3.1": freq.gnomad31 || 0,
        "gnomAD v4.1 Exome": freq.gnomad41_exome || 0,
        "gnomAD v4.1 Genome": freq.gnomad41_genome || 0,
      }))
      .filter(
        (item) =>
          item["1000G Phase 3"] > 0 ||
          item["gnomAD v3.1"] > 0 ||
          item["gnomAD v4.1 Exome"] > 0 ||
          item["gnomAD v4.1 Genome"] > 0,
      );
  }, [validFrequencies]);

  const ancestryColors = [
    "#3b82f6", // blue for 1000G
    "#10b981", // green for gnomAD v3.1
    "#8b5cf6", // purple-600 for gnomAD v4.1 Exome
    "#a855f7", // purple-500 for gnomAD v4.1 Genome
  ];

  if (validFrequencies.length === 0) {
    return (
      <NoDataState
        categoryName="Ancestry Frequency Data"
        description="No ancestry-specific allele frequency data is available for this variant."
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
          <AncestryFrequencyTable data={validFrequencies} />
        </TabsContent>

        <TabsContent value="visualization" className="mt-4">
          {chartData.length > 0 && (
            <BarChart
              data={chartData}
              keys={[
                "1000G Phase 3",
                "gnomAD v3.1",
                "gnomAD v4.1 Exome",
                "gnomAD v4.1 Genome",
              ]}
              indexBy="population"
              title="Ancestry Allele Frequencies by Population"
              yLabel="Allele Frequency"
              xLabel=""
              height={550}
              margin={{ top: 5, right: 10, bottom: 30, left: 10 }}
              colors={ancestryColors}
              showLegend={true}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
