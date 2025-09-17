"use client";

import React, { useState } from "react";
import {
  ResponsiveTabs,
  type TabConfig,
} from "@/components/ui/responsive-tabs";
import { NoDataState } from "@/components/ui/error-states";
import { PPI_SOURCES, type PPIData } from "@/lib/gene/ppi/constants";
import { BiogridTable } from "./biogrid/biogrid-table";
import { IntactNetwork } from "./intact/intact-network";
import { IntactTable } from "./intact/intact-table";
import { HuriNetwork } from "./huri/huri-network";
import { HuriTable } from "./huri/huri-table";
import { BiogridNetworkEnhanced } from "./biogrid/biogrid-network-enhanced";

interface PPIDashboardProps {
  ppiData: PPIData;
  geneName: string;
}

export function PPIDashboard({ ppiData, geneName }: PPIDashboardProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const availableSources = Object.keys(ppiData) as Array<keyof typeof ppiData>;

  if (availableSources.length === 0) {
    return (
      <NoDataState
        categoryName="protein-protein interaction data"
        title="No PPI Data Available"
        description="No protein-protein interaction data is available for this gene from any of our data sources."
      />
    );
  }

  const renderNetworkComponent = (sourceKey: string, sourceData: any[]) => {
    if (!sourceData || sourceData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {sourceKey} network data available
        </div>
      );
    }

    switch (sourceKey) {
      case "BioGRID":
        return (
          <BiogridNetworkEnhanced
            data={sourceData}
            onNodeSelect={setSelectedNode}
            selectedNode={selectedNode}
            queryGene={geneName}
          />
        );
      case "IntAct":
        return (
          <IntactNetwork
            data={sourceData}
            onNodeSelect={setSelectedNode}
            selectedNode={selectedNode}
            queryGene={geneName}
          />
        );
      case "HuRI":
        return (
          <HuriNetwork
            data={sourceData}
            onNodeSelect={setSelectedNode}
            selectedNode={selectedNode}
          />
        );
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Unknown source: {sourceKey}
          </div>
        );
    }
  };

  const renderTableComponent = (sourceKey: string, sourceData: any[]) => {
    if (!sourceData || sourceData.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {sourceKey} interaction data available
        </div>
      );
    }

    switch (sourceKey) {
      case "BioGRID":
        return <BiogridTable data={sourceData} selectedNode={selectedNode} />;
      case "IntAct":
        return <IntactTable data={sourceData} selectedNode={selectedNode} />;
      case "HuRI":
        return <HuriTable data={sourceData} selectedNode={selectedNode} />;
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Unknown source: {sourceKey}
          </div>
        );
    }
  };

  const sourceTabs: TabConfig[] = availableSources.map((sourceKey) => {
    const sourceData = ppiData[sourceKey];
    const sourceInfo = PPI_SOURCES[sourceKey as keyof typeof PPI_SOURCES];

    const innerTabs: TabConfig[] = [
      {
        id: "network",
        label: "Network View",
        shortLabel: "Net",
        count: sourceData.length,
        content: renderNetworkComponent(sourceKey, sourceData),
      },
      {
        id: "interactions",
        label: "Data Table",
        shortLabel: "Table",
        count: sourceData.length,
        content: renderTableComponent(sourceKey, sourceData),
      },
    ];

    return {
      id: sourceKey,
      label: sourceInfo.name,
      shortLabel: sourceInfo.name.slice(0, 4),
      count: sourceData.length,
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
