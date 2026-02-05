"use client";

import { cn } from "@infra/utils";
import cytoscape, {
  type Core,
  type EdgeSingular,
  type EventObject,
  type NodeSingular,
  type StylesheetStyle,
} from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import dagre from "cytoscape-dagre";
import { memo, useEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import {
  type ExplorerCytoscapeProps,
  type ExplorerNode,
  type ExplorerEdge,
  getExplorerLayoutOptions,
  NODE_TYPE_COLORS,
  EDGE_TYPE_CONFIG,
} from "./types";

// Register layout extensions
if (typeof cytoscape("layout", "cose-bilkent") === "undefined") {
  cytoscape.use(coseBilkent);
}
if (typeof cytoscape("layout", "dagre") === "undefined") {
  cytoscape.use(dagre);
}

// =============================================================================
// Stylesheet
// =============================================================================

const STYLESHEET: StylesheetStyle[] = [
  // Base node style
  {
    selector: "node",
    style: {
      "background-color": "data(backgroundColor)",
      "border-color": "data(borderColor)",
      "border-width": 2,
      width: "data(nodeSize)",
      height: "data(nodeSize)",
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 6,
      "font-size": 11,
      "font-weight": 500,
      color: "#334155",
      "text-outline-color": "#ffffff",
      "text-outline-width": 2,
    },
  },
  // Seed node (larger, distinct)
  {
    selector: "node.seed",
    style: {
      "border-width": 3,
      "font-weight": 600,
    },
  },
  // Selected node
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#1e40af",
    },
  },
  // Multi-selected nodes
  {
    selector: "node.multi-selected",
    style: {
      "border-width": 3,
      "border-color": "#9333ea",
      "border-style": "double" as never,
    },
  },
  // Path highlight - nodes in path
  {
    selector: "node.path-node",
    style: {
      "border-width": 4,
      "border-color": "#f59e0b",
      "z-index": 100,
    },
  },
  // Path highlight - dimmed nodes
  {
    selector: "node.path-dimmed",
    style: {
      opacity: 0.3,
    },
  },
  // Entity type specific styles
  {
    selector: "node.entity-gene",
    style: {
      "background-color": NODE_TYPE_COLORS.Gene.background,
      "border-color": NODE_TYPE_COLORS.Gene.border,
    },
  },
  {
    selector: "node.entity-disease",
    style: {
      "background-color": NODE_TYPE_COLORS.Disease.background,
      "border-color": NODE_TYPE_COLORS.Disease.border,
    },
  },
  {
    selector: "node.entity-drug",
    style: {
      "background-color": NODE_TYPE_COLORS.Drug.background,
      "border-color": NODE_TYPE_COLORS.Drug.border,
    },
  },
  {
    selector: "node.entity-pathway",
    style: {
      "background-color": NODE_TYPE_COLORS.Pathway.background,
      "border-color": NODE_TYPE_COLORS.Pathway.border,
    },
  },
  {
    selector: "node.entity-variant",
    style: {
      "background-color": NODE_TYPE_COLORS.Variant.background,
      "border-color": NODE_TYPE_COLORS.Variant.border,
    },
  },
  {
    selector: "node.entity-trait",
    style: {
      "background-color": NODE_TYPE_COLORS.Trait.background,
      "border-color": NODE_TYPE_COLORS.Trait.border,
    },
  },
  // Base edge style
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      "line-color": "data(lineColor)",
      width: "data(edgeWidth)",
      opacity: 0.7,
      "target-arrow-shape": "triangle",
      "target-arrow-color": "data(lineColor)",
      "arrow-scale": 0.8,
    },
  },
  // Edge hover
  {
    selector: "edge:hover",
    style: {
      opacity: 1,
      width: 3,
      "z-index": 10,
    },
  },
  // Edge selected
  {
    selector: "edge:selected",
    style: {
      "line-color": "#6366f1",
      "target-arrow-color": "#6366f1",
      width: 4,
      opacity: 1,
    },
  },
  {
    selector: "edge.selected",
    style: {
      "line-color": "#6366f1",
      "target-arrow-color": "#6366f1",
      width: 4,
      opacity: 1,
      "z-index": 20,
    },
  },
  // Path highlight - edges in path
  {
    selector: "edge.path-edge",
    style: {
      "line-color": "#f59e0b",
      "target-arrow-color": "#f59e0b",
      width: 4,
      opacity: 1,
      "z-index": 50,
    },
  },
  // Path highlight - dimmed edges
  {
    selector: "edge.path-dimmed",
    style: {
      opacity: 0.2,
    },
  },
  // Edge type specific colors
  {
    selector: "edge.edge-interacts-with",
    style: {
      "line-color": EDGE_TYPE_CONFIG.INTERACTS_WITH.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.INTERACTS_WITH.color,
      "target-arrow-shape": "none", // PPI is undirected
    },
  },
  {
    selector: "edge.edge-associated-with",
    style: {
      "line-color": EDGE_TYPE_CONFIG.ASSOCIATED_WITH.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.ASSOCIATED_WITH.color,
    },
  },
  {
    selector: "edge.edge-implicated-in",
    style: {
      "line-color": EDGE_TYPE_CONFIG.IMPLICATED_IN.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.IMPLICATED_IN.color,
    },
  },
  {
    selector: "edge.edge-participates-in",
    style: {
      "line-color": EDGE_TYPE_CONFIG.PARTICIPATES_IN.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.PARTICIPATES_IN.color,
    },
  },
  {
    selector: "edge.edge-targets",
    style: {
      "line-color": EDGE_TYPE_CONFIG.TARGETS.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.TARGETS.color,
    },
  },
  {
    selector: "edge.edge-treats",
    style: {
      "line-color": EDGE_TYPE_CONFIG.TREATS.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.TREATS.color,
    },
  },
  {
    selector: "edge.edge-part-of",
    style: {
      "line-color": EDGE_TYPE_CONFIG.PART_OF.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.PART_OF.color,
    },
  },
  {
    selector: "edge.edge-gwas-associated",
    style: {
      "line-color": EDGE_TYPE_CONFIG.GWAS_ASSOCIATED.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.GWAS_ASSOCIATED.color,
    },
  },
  {
    selector: "edge.edge-has-variant",
    style: {
      "line-color": EDGE_TYPE_CONFIG.HAS_VARIANT.color,
      "target-arrow-color": EDGE_TYPE_CONFIG.HAS_VARIANT.color,
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert Cytoscape node data back to ExplorerNode
 */
function dataToNode(data: Record<string, unknown>): ExplorerNode {
  return {
    id: String(data.id ?? ""),
    type: String(data.type ?? "Gene") as ExplorerNode["type"],
    label: String(data.label ?? "Unknown"),
    entity: {
      type: String(data.type ?? "Gene"),
      id: String(data.id ?? ""),
      label: String(data.label ?? "Unknown"),
    } as ExplorerNode["entity"],
    isSeed: Boolean(data.isSeed),
    depth: typeof data.depth === "number" ? data.depth : 0,
    degree: typeof data.degree === "number" ? data.degree : undefined,
    hubScore: typeof data.hubScore === "number" ? data.hubScore : undefined,
    percentile: typeof data.percentile === "number" ? data.percentile : undefined,
  };
}

/**
 * Convert Cytoscape edge data back to ExplorerEdge
 */
function dataToEdge(data: Record<string, unknown>): ExplorerEdge {
  return {
    id: String(data.id ?? ""),
    type: String(data.type ?? "INTERACTS_WITH") as ExplorerEdge["type"],
    sourceId: String(data.source ?? ""),
    targetId: String(data.target ?? ""),
    numSources: typeof data.numSources === "number" ? data.numSources : undefined,
    numExperiments: typeof data.numExperiments === "number" ? data.numExperiments : undefined,
  };
}

// =============================================================================
// Component
// =============================================================================

function ExplorerCytoscapeInner({
  elements,
  layout,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  onBackgroundClick,
  selectedNodeIds,
  selectedEdgeId,
  pathHighlight,
  className,
}: ExplorerCytoscapeProps) {
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef(layout);
  const initializedRef = useRef(false);

  // Store callbacks in refs to avoid recreating event handlers
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onEdgeClickRef = useRef(onEdgeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);

  // Reset initialization state on unmount
  useEffect(() => {
    return () => {
      initializedRef.current = false;
      cyRef.current = null;
    };
  }, []);

  // Update refs when callbacks change
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    onNodeHoverRef.current = onNodeHover;
  }, [onNodeHover]);

  useEffect(() => {
    onEdgeClickRef.current = onEdgeClick;
  }, [onEdgeClick]);

  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  // Handle multi-select highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    cy.nodes().removeClass("multi-selected");

    if (selectedNodeIds && selectedNodeIds.size > 0) {
      cy.nodes().forEach((node) => {
        if (selectedNodeIds.has(node.id())) {
          node.addClass("multi-selected");
        }
      });
    }
  }, [selectedNodeIds]);

  // Handle selected edge highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    cy.edges().removeClass("selected");

    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0) {
        edge.addClass("selected");
      }
    }
  }, [selectedEdgeId]);

  // Handle path highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    cy.nodes().removeClass("path-node path-dimmed");
    cy.edges().removeClass("path-edge path-dimmed");

    if (pathHighlight && (pathHighlight.nodeIds.size > 0 || pathHighlight.edgeIds.size > 0)) {
      cy.nodes().forEach((node) => {
        if (pathHighlight.nodeIds.has(node.id())) {
          node.addClass("path-node");
        } else {
          node.addClass("path-dimmed");
        }
      });

      cy.edges().forEach((edge) => {
        if (pathHighlight.edgeIds.has(edge.id())) {
          edge.addClass("path-edge");
        } else {
          edge.addClass("path-dimmed");
        }
      });
    }
  }, [pathHighlight]);

  // Handle layout changes
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;
    if (layoutRef.current === layout) return;

    layoutRef.current = layout;
    const layoutOptions = getExplorerLayoutOptions(layout);
    cy.layout(layoutOptions).run();
  }, [layout]);

  // Memoize elements key to detect changes
  const elementsKey = useMemo(
    () =>
      elements
        .filter((el) => !el.data.source)
        .map((el) => el.data.id)
        .sort()
        .join(","),
    [elements]
  );

  // Track previous element count for forced layout re-run
  const prevElementCountRef = useRef(elements.length);

  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    const elementCountChanged = elements.length !== prevElementCountRef.current;
    prevElementCountRef.current = elements.length;

    const currentIds = cy.nodes().map((n) => n.id()).sort().join(",");

    if (currentIds !== elementsKey || elementCountChanged) {
      cy.elements().remove();
      cy.add(elements);

      const layoutOptions = getExplorerLayoutOptions(layout);
      cy.layout(layoutOptions).run();
    }
  }, [elementsKey, elements, layout]);

  // Cy callback - runs when CytoscapeComponent initializes
  const handleCy = (cy: Core) => {
    if (initializedRef.current && cyRef.current === cy) return;

    cyRef.current = cy;
    initializedRef.current = true;

    // Apply stylesheet
    cy.style().fromJson(STYLESHEET).update();

    // Initial layout
    const layoutOptions = getExplorerLayoutOptions(layoutRef.current);
    cy.layout(layoutOptions).run();

    // Node click handler
    cy.on("tap", "node", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const originalEvent = event.originalEvent as MouseEvent | undefined;
      onNodeClickRef.current?.(dataToNode(data), originalEvent);
    });

    // Edge click handler
    cy.on("tap", "edge", (event: EventObject) => {
      const edge = event.target as EdgeSingular;
      const data = edge.data();
      const midpoint = edge.midpoint();
      const container = cy.container();

      if (container && onEdgeClickRef.current) {
        const rect = container.getBoundingClientRect();
        const pan = cy.pan();
        const zoom = cy.zoom();

        const renderedX = midpoint.x * zoom + pan.x;
        const renderedY = midpoint.y * zoom + pan.y;

        onEdgeClickRef.current(dataToEdge(data), {
          x: rect.left + renderedX,
          y: rect.top + renderedY,
        });
      }
    });

    // Background click handler
    cy.on("tap", (event: EventObject) => {
      if (event.target === cy) {
        onBackgroundClickRef.current?.();
      }
    });

    // Node hover handlers
    cy.on("mouseover", "node", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const renderedPosition = node.renderedPosition();
      const container = cy.container();
      if (container) {
        const rect = container.getBoundingClientRect();
        onNodeHoverRef.current?.(dataToNode(data), {
          x: rect.left + renderedPosition.x,
          y: rect.top + renderedPosition.y,
        });
      }
    });

    cy.on("mouseout", "node", () => {
      onNodeHoverRef.current?.(null, null);
    });

    // Cursor changes on hover
    cy.on("mouseover", "node, edge", () => {
      const container = cy.container();
      if (container) container.style.cursor = "pointer";
    });

    cy.on("mouseout", "node, edge", () => {
      const container = cy.container();
      if (container) container.style.cursor = "default";
    });

    // Fit graph after layout
    cy.on("layoutstop", () => {
      cy.fit(undefined, 40);
    });
  };

  return (
    <div className={cn("relative w-full h-full bg-slate-50", className)}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        className="w-full h-full"
        cy={handleCy}
        wheelSensitivity={0.3}
        minZoom={0.2}
        maxZoom={3}
        boxSelectionEnabled={true}
        autounselectify={false}
      />
    </div>
  );
}

// Memoize the component to prevent re-renders
export const ExplorerCytoscape = memo(ExplorerCytoscapeInner);
