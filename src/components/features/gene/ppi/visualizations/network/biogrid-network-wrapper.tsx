"use client";

import React, { useMemo } from "react";
import type { NetworkData } from "../../shared/types";
import type { BiogridInteraction } from "@/lib/gene/ppi/constants";
import { transformBiogridData } from "../../biogrid/biogrid-transforms";

interface BiogridNetworkWrapperProps {
  data: NetworkData;
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
  queryGene?: string;
}

// We'll import the original BiogridNetwork component but need to adapt the data
// For now, this is a placeholder that transforms NetworkData back to BiogridInteraction[]
export function BiogridNetworkWrapper({
  data,
  selectedNode,
  onNodeSelect,
  queryGene,
}: BiogridNetworkWrapperProps) {
  // Transform NetworkData back to BiogridInteraction format
  const biogridData = useMemo((): BiogridInteraction[] => {
    // This is a simplified transformation - in a real implementation,
    // you'd want to preserve the original data structure or create a proper adapter
    return data.edges.map((edge: any, index: number) => ({
      interaction_id: edge.id || `interaction-${index}`,
      protein_a_gene: edge.source,
      protein_b_gene: edge.target,
      interaction_detection_method: edge.method || "Unknown",
      interaction_types: edge.interactionType || "Unknown",
      publication_identifiers: `Publication-${index}`,
      confidence_numeric: edge.studyCount || 1,
    }));
  }, [data]);

  // Import the actual BiogridNetwork component dynamically
  // This prevents circular imports and allows for cleaner separation
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">
          Network visualization with {data.nodes.length} nodes
        </p>
        <p className="text-sm text-muted-foreground">
          {selectedNode
            ? `Selected: ${selectedNode}`
            : "Click a node to select"}
        </p>
        <div className="mt-4 p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">
            Network wrapper - integrate with existing BiogridNetwork component
          </p>
        </div>
      </div>
    </div>
  );
}
