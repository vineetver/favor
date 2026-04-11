"use client";

import {
  NODE_TYPE_COLORS,
  SEED_NODE_COLORS,
} from "@features/graph/config/styling";
import type { EdgeType } from "@features/graph/types/edge";
import { EDGE_TYPE_CONFIG } from "@features/graph/types/edge";
import type { EntityType } from "@features/graph/types/entity";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { useCallback, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import type { NetworkVizSpec } from "../../viz/types";

// Register layout extension
if (typeof cytoscape("layout", "cose-bilkent") === "undefined") {
  cytoscape.use(coseBilkent);
}

const DEFAULT_NODE_COLOR = { background: "#f1f5f9", border: "#64748b" };
const DEFAULT_EDGE_COLOR = "#94a3b8";

function getNodeColor(type: string, isSeed: boolean) {
  if (isSeed)
    return {
      background: SEED_NODE_COLORS.background,
      border: SEED_NODE_COLORS.border,
    };
  const colors = NODE_TYPE_COLORS[type as EntityType];
  return colors
    ? { background: colors.background, border: colors.border }
    : DEFAULT_NODE_COLOR;
}

function getEdgeColor(type: string): string {
  return EDGE_TYPE_CONFIG[type as EdgeType]?.color ?? DEFAULT_EDGE_COLOR;
}

const STYLESHEET: cytoscape.StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "background-color": "data(backgroundColor)",
      "border-color": "data(borderColor)",
      "border-width": 2,
      width: "data(nodeSize)",
      height: "data(nodeSize)",
      "font-size": 10,
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 4,
      "text-max-width": "80px",
      "text-wrap": "ellipsis",
      color: "#334155",
    },
  },
  {
    selector: "edge",
    style: {
      "line-color": "data(lineColor)",
      width: 1.5,
      "curve-style": "bezier",
      "target-arrow-shape": "none",
      opacity: 0.6,
    },
  },
];

export function AgentMiniNetwork({ spec }: { spec: NetworkVizSpec }) {
  const elements = useMemo(() => {
    const nodes = spec.nodes.map((n) => {
      const colors = getNodeColor(n.type, n.isSeed);
      return {
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          backgroundColor: colors.background,
          borderColor: colors.border,
          nodeSize: n.isSeed ? 40 : 28,
        },
      };
    });

    // Only include edges whose source and target exist in nodes
    const nodeIds = new Set(spec.nodes.map((n) => n.id));
    const edges = spec.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          lineColor: getEdgeColor(e.type),
        },
      }));

    return [...nodes, ...edges];
  }, [spec.nodes, spec.edges]);

  const handleCy = useCallback((cy: cytoscape.Core) => {
    cy.layout({
      name: "cose-bilkent",
      animate: false,
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 80,
      nodeRepulsion: 4500,
      edgeElasticity: 0.1,
      gravity: 0.25,
      fit: true,
      padding: 20,
    } as cytoscape.LayoutOptions).run();
  }, []);

  if (elements.length === 0) return null;

  return (
    <div className="h-[300px] w-full rounded-md border border-border bg-card overflow-hidden">
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        cy={handleCy}
        wheelSensitivity={0.3}
        minZoom={0.3}
        maxZoom={3}
        boxSelectionEnabled={false}
        autounselectify
        className="w-full h-full"
      />
    </div>
  );
}
