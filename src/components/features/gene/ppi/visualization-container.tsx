"use client";

import React, { useState, useMemo } from "react";
import {
  VisualizationType,
  NetworkData,
  ChordData,
  VISUALIZATION_CONFIG,
} from "@/lib/gene/ppi/types";

interface VisualizationContainerProps {
  data: NetworkData;
  currentView: VisualizationType;
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
  queryGene?: string;
  networkComponent: React.ComponentType<{
    data: NetworkData;
    selectedNode?: string | null;
    onNodeSelect?: (node: string | null) => void;
    queryGene?: string;
  }>;
  chordComponent?: React.ComponentType<{
    data: ChordData;
    selectedNode?: string | null;
    onNodeSelect?: (node: string | null) => void;
    queryGene?: string;
  }>;
  className?: string;
}

export function VisualizationContainer({
  data,
  currentView,
  selectedNode,
  onNodeSelect,
  queryGene,
  networkComponent: NetworkComponent,
  chordComponent: ChordComponent,
  className = "",
}: VisualizationContainerProps) {
  const chordData = useMemo((): ChordData | null => {
    if (currentView !== "chord" || !ChordComponent) return null;

    // Transform network data to chord matrix
    const nodeMap = new Map(data.nodes.map((node, index) => [node.id, index]));
    const matrix: number[][] = Array(data.nodes.length)
      .fill(null)
      .map(() => Array(data.nodes.length).fill(0));

    // Populate matrix with edge weights
    data.edges.forEach((edge) => {
      const sourceIndex = nodeMap.get(edge.source);
      const targetIndex = nodeMap.get(edge.target);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        const weight = edge.weight || edge.studyCount || 1;
        matrix[sourceIndex][targetIndex] = weight;
        // For undirected graphs, make symmetric
        matrix[targetIndex][sourceIndex] = weight;
      }
    });

    const nodeData = data.nodes.reduce(
      (acc, node) => {
        acc[node.id] = node;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      matrix,
      labels: data.nodes.map((node) => node.label || node.id),
      nodeData,
    };
  }, [data, currentView, ChordComponent]);

  const shouldShowChord =
    currentView === "chord" &&
    data.nodes.length <= VISUALIZATION_CONFIG.CHORD_MAX_NODES &&
    data.nodes.length > 1 &&
    ChordComponent &&
    chordData;

  if (shouldShowChord && chordData && ChordComponent) {
    return (
      <div className={className}>
        <ChordComponent
          data={chordData}
          selectedNode={selectedNode}
          onNodeSelect={onNodeSelect}
          queryGene={queryGene}
        />
      </div>
    );
  }

  // Default to network view
  return (
    <div className={className}>
      <NetworkComponent
        data={data}
        selectedNode={selectedNode}
        onNodeSelect={onNodeSelect}
        queryGene={queryGene}
      />
    </div>
  );
}
