"use client";

import { ResponsiveTabs, type TabConfig } from "@/components/ui/responsive-tabs";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/general";
import type { Variant } from "@/lib/variant/api";
import { isValidNumber } from "@/lib/annotations/helpers";

interface EpigeneticsDisplayProps {
  items: any[];
  variant: Variant;
}

const EpigeneticsVisualization = ({ variant }: { variant: Variant }) => {
  const chromateMarks = [
    // Active marks
    { name: "DNase", value: variant.encode_dnase_sum, range: [0.001, 118672], category: "active", description: "Chromatin accessibility" },
    { name: "H3K27ac", value: variant.encodeh3k27ac_sum, range: [0.013, 288.608], category: "active", description: "Active enhancers/promoters" },
    { name: "H3K4me1", value: variant.encodeh3k4me1_sum, range: [0.015, 91.954], category: "active", description: "Enhancer regions" },
    { name: "H3K4me2", value: variant.encodeh3k4me2_sum, range: [0.024, 148.887], category: "active", description: "Active promoters" },
    { name: "H3K4me3", value: variant.encodeh3k4me3_sum, range: [0.012, 239.512], category: "active", description: "Active promoters (TSS)" },
    { name: "H3K9ac", value: variant.encodeh3k9ac_sum, range: [0.019, 281.187], category: "active", description: "Transcriptionally active" },
    { name: "H4K20me1", value: variant.encodeh4k20me1_sum, range: [0.018, 42.049], category: "active", description: "Active chromatin" },
    
    // Repressive marks
    { name: "H3K9me3", value: variant.encodeh3k9me3_sum, range: [0.006, 51.456], category: "repressed", description: "Heterochromatin" },
    { name: "H3K27me3", value: variant.encodeh3k27me3_sum, range: [0.001, 1218.41], category: "repressed", description: "Polycomb repression" },
    
    // Transcription marks
    { name: "H3K36me3", value: variant.encodeh3k36me3_sum, range: [0.005, 118.672], category: "transcription", description: "Gene body transcription" },
    { name: "H3K79me2", value: variant.encodeh3k79me2_sum, range: [0.003, 30.556], category: "transcription", description: "Active transcription" },
  ];

  const apcScores = [
    { name: "Active", value: variant.apc_epigenetics_active, range: [0, 86.238], category: "active" },
    { name: "Repressed", value: variant.apc_epigenetics_repressed, range: [0, 86.238], category: "repressed" },
    { name: "Transcription", value: variant.apc_epigenetics_transcription, range: [0, 86.238], category: "transcription" },
  ];

  const getNormalizedValue = (value: number, range: [number, number]) => {
    if (!isValidNumber(value)) return 0;
    return Math.min(Math.max((value - range[0]) / (range[1] - range[0]), 0), 1);
  };

  const getCategoryColor = (category: string, intensity: number = 1) => {
    const alpha = Math.max(0.1, intensity);
    switch (category) {
      case "active": return `rgba(34, 197, 94, ${alpha})`;
      case "repressed": return `rgba(239, 68, 68, ${alpha})`;
      case "transcription": return `rgba(147, 51, 234, ${alpha})`;
      default: return `rgba(156, 163, 175, ${alpha})`;
    }
  };

  // Chromatin Heatmap Visualization
  const ChromatinHeatmap = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Chromatin Modification Landscape</CardTitle>
        <CardDescription>
          Heatmap showing intensity of all histone modifications and chromatin accessibility
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span>Low intensity</span>
            <span>High intensity</span>
          </div>
          
          {/* Heatmap Grid */}
          <div className="space-y-2">
            {chromateMarks.map((mark) => {
              const normalizedValue = getNormalizedValue(mark.value, mark.range as [number, number]);
              const hasData = isValidNumber(mark.value);
              
              return (
                <div key={mark.name} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium text-right">{mark.name}</div>
                  
                  {/* Heatmap bar */}
                  <div className="flex-1 relative h-8 bg-gray-100 rounded-md overflow-hidden">
                    {hasData && (
                      <div 
                        className="h-full transition-all duration-300 rounded-md"
                        style={{
                          width: `${normalizedValue * 100}%`,
                          backgroundColor: getCategoryColor(mark.category, normalizedValue * 0.8 + 0.2)
                        }}
                      />
                    )}
                    {!hasData && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-gray-50 rounded-md">
                        No data
                      </div>
                    )}
                  </div>
                  
                  <div className="w-20 text-xs text-muted-foreground">
                    {hasData ? mark.value.toFixed(2) : "N/A"}
                  </div>
                  
                  <div className="w-32 text-xs text-muted-foreground">
                    {mark.description}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Category Legend */}
          <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor("active", 0.7) }}></div>
              <span className="text-xs font-medium">Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor("repressed", 0.7) }}></div>
              <span className="text-xs font-medium">Repressed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getCategoryColor("transcription", 0.7) }}></div>
              <span className="text-xs font-medium">Transcription</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // aPC Scores Bar Chart
  const APCScoresChart = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">aPC Integrated Scores</CardTitle>
        <CardDescription>
          PHRED-scaled integrative scores combining multiple histone modifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {apcScores.map((score) => {
            const normalizedValue = getNormalizedValue(score.value, score.range as [number, number]);
            const hasData = isValidNumber(score.value);
            
            return (
              <div key={score.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{score.name}</span>
                  <span className="text-sm font-mono">
                    {hasData ? score.value.toFixed(2) : "N/A"}
                  </span>
                </div>
                
                {/* Bar chart */}
                <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden">
                  {hasData && (
                    <div 
                      className="h-full transition-all duration-500 rounded-md flex items-center justify-end pr-2"
                      style={{
                        width: `${normalizedValue * 100}%`,
                        backgroundColor: getCategoryColor(score.category, 0.8)
                      }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {(normalizedValue * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {!hasData && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      No data available
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{score.range[0]}</span>
                  <span>{score.range[1]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  // Summary Statistics
  const SummaryStats = () => {
    const activeMarks = chromateMarks.filter(m => m.category === "active" && isValidNumber(m.value));
    const repressedMarks = chromateMarks.filter(m => m.category === "repressed" && isValidNumber(m.value));
    const transcriptionMarks = chromateMarks.filter(m => m.category === "transcription" && isValidNumber(m.value));
    
    const totalMarks = chromateMarks.length;
    const detectedMarks = chromateMarks.filter(m => isValidNumber(m.value)).length;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chromatin State Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-green-600">{activeMarks.length}</div>
              <div className="text-xs text-muted-foreground">Active Marks</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-red-600">{repressedMarks.length}</div>
              <div className="text-xs text-muted-foreground">Repressed Marks</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-purple-600">{transcriptionMarks.length}</div>
              <div className="text-xs text-muted-foreground">Transcription Marks</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold">{detectedMarks}/{totalMarks}</div>
              <div className="text-xs text-muted-foreground">Total Detected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <SummaryStats />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <APCScoresChart />
        <div className="xl:row-span-2">
          <ChromatinHeatmap />
        </div>
      </div>
    </div>
  );
};

export function EpigeneticsDisplay({ items, variant }: EpigeneticsDisplayProps) {
  const tabs: TabConfig[] = [
    {
      id: "visualization",
      label: "Chromatin Landscape",
      shortLabel: "Visual",
      content: <EpigeneticsVisualization variant={variant} />,
    },
    {
      id: "table",
      label: "Annotation Table",
      shortLabel: "Table",
      count: items.length,
      content: (
        <DataComparisonTable
          items={items}
          leftColumn="value"
          rightColumn="activity"
          leftColumnHeader="Epigenetics Score"
          rightColumnHeader="Regulatory State"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} defaultValue="visualization" />
    </div>
  );
}