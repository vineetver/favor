"use client";

import React, { useMemo } from "react";
import type { NetworkData } from "../../shared/types";
import type { IntactInteraction } from "@/lib/gene/ppi/constants";

interface IntactNetworkWrapperProps {
  data: NetworkData;
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
  queryGene?: string;
}

export function IntactNetworkWrapper({
  data,
  selectedNode,
  onNodeSelect,
  queryGene,
}: IntactNetworkWrapperProps) {
  // Transform NetworkData back to IntactInteraction format
  const intactData = useMemo((): IntactInteraction[] => {
    return data.edges.map((edge: any, index: number) => ({
      interaction_id: edge.id || `intact-interaction-${index}`,
      gene_a_name: edge.source,
      gene_b_name: edge.target,
      interaction_detection_method: edge.method || "Unknown",
      interaction_type: edge.interactionType || "Unknown",
      publication_identifier: `Publication-${index}`,
      confidence_value: (edge.studyCount || 1).toString(),
      expansion_method: "spoke",
      biological_role_a: "unspecified",
      biological_role_b: "unspecified",
      experimental_role_a: "neutral",
      experimental_role_b: "neutral",
      host_organism: "human",
      negative: false,
    }));
  }, [data]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">
          IntAct Network visualization with {data.nodes.length} nodes
        </p>
        <p className="text-sm text-muted-foreground">
          {selectedNode
            ? `Selected: ${selectedNode}`
            : "Click a node to select"}
        </p>
        <div className="mt-4 p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground">
            IntAct network wrapper - integrate with existing IntactNetwork
            component
          </p>
        </div>
      </div>
    </div>
  );
}
