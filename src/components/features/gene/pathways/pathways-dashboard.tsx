"use client";

import React, { useState, useMemo } from "react";
import { ResponsiveTabs, type TabConfig } from "@/components/ui/responsive-tabs";
import { NoDataState } from "@/components/ui/error-states";
import { PathwayNetworkDisplay } from "./pathway-network-display";
import { PathwayGenesTable } from "@/components/features/gene/pathways/pathway-genes-table";
import { PATHWAY_SOURCES, PathwayData } from "@/lib/gene/pathways/constants";

interface PathwaysDashboardProps {
  pathwayData: PathwayData;
}

export function PathwaysDashboard({ pathwayData }: PathwaysDashboardProps) {
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Get available sources from data
  const availableSources = Object.keys(pathwayData);

  // If no data, show empty state
  if (availableSources.length === 0) {
    return (
      <NoDataState
        categoryName="pathway data"
        title="No Pathway Data Available"
        description="No pathway information is available for this gene from any of our data sources."
      />
    );
  }

  // Create source tabs for responsive tabs
  const sourceTabs: TabConfig[] = availableSources.map((sourceKey) => {
    const sourceData = pathwayData[sourceKey];
    const sourceInfo = PATHWAY_SOURCES[sourceKey as keyof typeof PATHWAY_SOURCES];
    
    // Create highlighting data for this source
    const highlightData = {
      selectedPathway,
      selectedNode,
      pathwayGenes:
        selectedPathway && sourceData
          ? sourceData.genes
              .filter((gene) => gene.pathway === selectedPathway)
              .map((g) => g.gene_name)
          : [],
      pathwayInteractions:
        selectedPathway && sourceData
          ? sourceData.interactions.filter(
              (i) => i.pathway === selectedPathway,
            )
          : [],
    };

    // Create inner tabs for each source
    const innerTabs: TabConfig[] = [
      {
        id: "network",
        label: "Network View",
        shortLabel: "Net",
        count: sourceData.interactions.length + sourceData.genes.length,
        content: (
          <PathwayNetworkDisplay
            interactions={sourceData.interactions}
            genes={sourceData.genes}
            sourceInfo={sourceInfo}
            onPathwaySelect={setSelectedPathway}
            selectedPathway={selectedPathway}
            onNodeSelect={setSelectedNode}
            selectedNode={selectedNode}
            pathwayData={{ [sourceKey]: sourceData }}
            selectedSource={sourceKey}
            onSourceSelect={() => {}} // Not needed since we're using tabs
          />
        ),
      },
      {
        id: "interactions",
        label: "Interactions",
        shortLabel: "Int",
        count: sourceData.interactions.length,
        content: (
          <PathwayGenesTable
            data={sourceData.interactions.map((interaction) => ({
              pathway: interaction.pathway,
              gene_name: interaction.gene_interactor_a,
              source: interaction.source,
              method: interaction.method,
              degree: interaction.degree,
              interactor_b: interaction.gene_interactor_b,
            }))}
            type="interactions"
            highlightData={highlightData}
          />
        ),
      },
      {
        id: "genes",
        label: "Pathway Genes", 
        shortLabel: "Gen",
        count: sourceData.genes.length,
        content: (
          <PathwayGenesTable
            data={sourceData.genes}
            type="genes"
            highlightData={highlightData}
          />
        ),
      },
    ];

    return {
      id: sourceKey,
      label: sourceInfo.name,
      shortLabel: sourceInfo.name.slice(0, 4),
      count: sourceData.interactions.length + sourceData.genes.length,
      content: (
        <div className="space-y-4">
          <ResponsiveTabs
            tabs={innerTabs}
            defaultValue="network"
            className="w-full"
          />
        </div>
      ),
    };
  });

  return (
    <div className="space-y-6">
      <ResponsiveTabs
        tabs={sourceTabs}
        defaultValue={availableSources[0]}
        className="w-full"
      />
    </div>
  );
}
