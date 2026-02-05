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
import { memo, useEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { getHubColor, getHubNodeSize, nodeToData } from "../../utils/ppi-graph-utils";
import { getLayoutOptions, type PPICytoscapeGraphProps, type CentralityData } from "./types";

// Register the CoSE-Bilkent layout extension
if (typeof cytoscape("layout", "cose-bilkent") === "undefined") {
  cytoscape.use(coseBilkent);
}

const STYLESHEET: StylesheetStyle[] = [
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
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#1e40af",
      "background-color": "data(backgroundColor)",
    },
  },
  // Multi-select mode: selected genes for comparison
  {
    selector: "node.multi-selected",
    style: {
      "border-width": 3,
      "border-color": "#9333ea",
      "border-style": "double" as never,
    },
  },
  // Shared interactor highlight
  {
    selector: "node.shared-interactor",
    style: {
      "background-color": "#a855f7",
      "border-color": "#7e22ce",
      "border-width": 3,
    },
  },
  // Path mode: nodes in path
  {
    selector: "node.path-node",
    style: {
      "border-width": 4,
      "border-color": "#f59e0b",
      "z-index": 100,
    },
  },
  // Path mode: dimmed nodes not in path
  {
    selector: "node.path-dimmed",
    style: {
      opacity: 0.3,
    },
  },
  // Base edge style
  {
    selector: "edge.ppi-edge",
    style: {
      "curve-style": "bezier",
      opacity: 0.7,
      "target-arrow-shape": "none",
      "line-color": "#cbd5e1",
      width: 1,
    },
  },
  // Edge style by source count - 1 source (lightest)
  {
    selector: "edge.sources-1",
    style: {
      "line-color": "#cbd5e1",  // slate-300
      width: 1,
    },
  },
  // Edge style by source count - 2 sources
  {
    selector: "edge.sources-2",
    style: {
      "line-color": "#94a3b8",  // slate-400
      width: 2,
    },
  },
  // Edge style by source count - 3 sources
  {
    selector: "edge.sources-3",
    style: {
      "line-color": "#64748b",  // slate-500
      width: 3,
    },
  },
  // Edge style by source count - 4+ sources (darkest)
  {
    selector: "edge.sources-4",
    style: {
      "line-color": "#475569",  // slate-600
      width: 4,
    },
  },
  {
    selector: "edge.ppi-edge:hover",
    style: {
      "line-color": "#6366f1",
      width: 3,
      opacity: 1,
      "z-index": 10,
    },
  },
  {
    selector: "edge.ppi-edge.selected",
    style: {
      "line-color": "#6366f1",
      width: 4,
      opacity: 1,
      "z-index": 20,
    },
  },
  {
    selector: "edge.ppi-edge:selected",
    style: {
      "line-color": "#6366f1",
      width: 4,
      opacity: 1,
    },
  },
  // Path mode: edges in path
  {
    selector: "edge.ppi-edge.path-edge",
    style: {
      "line-color": "#f59e0b",
      width: 4,
      opacity: 1,
      "z-index": 50,
      "line-style": "solid",
    },
  },
  // Path mode: dimmed edges not in path
  {
    selector: "edge.ppi-edge.path-dimmed",
    style: {
      opacity: 0.2,
    },
  },
];

function PPICytoscapeGraphInner({
  elements,
  layout,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  selectedEdgeId,
  colorMode = "experiments",
  centralityData,
  pathHighlight,
  selectedGeneIds,
  sharedInteractorIds,
  className,
}: PPICytoscapeGraphProps) {
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef(layout);
  const initializedRef = useRef(false);

  // Store callbacks in refs to avoid recreating event handlers
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onEdgeClickRef = useRef(onEdgeClick);

  // Reset initialization state on unmount to ensure proper re-init on remount
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

  // Handle selected edge highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Remove selected class from all edges
    cy.edges().removeClass("selected");

    // Add selected class to the selected edge
    if (selectedEdgeId) {
      const edge = cy.getElementById(selectedEdgeId);
      if (edge.length > 0) {
        edge.addClass("selected");
      }
    }
  }, [selectedEdgeId]);

  // Handle color mode changes (hub vs experiments)
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    if (colorMode === "hub" && centralityData && centralityData.size > 0) {
      // Find max degree for scaling
      let maxDegree = 0;
      centralityData.forEach((data) => {
        if (data.degree.total > maxDegree) maxDegree = data.degree.total;
      });

      // Update node styles based on hub data
      cy.nodes().forEach((node) => {
        const nodeId = node.id();
        const data = centralityData.get(nodeId);
        const isSeed = node.data("isSeed");

        if (data && !isSeed) {
          const colors = getHubColor(data.percentile.total);
          const size = getHubNodeSize(data.degree.total, maxDegree);
          node.style({
            "background-color": colors.background,
            "border-color": colors.border,
            width: size,
            height: size,
          });
        }
      });
    } else {
      // Restore experiment-based coloring from element data
      cy.nodes().forEach((node) => {
        node.style({
          "background-color": node.data("backgroundColor"),
          "border-color": node.data("borderColor"),
          width: node.data("nodeSize"),
          height: node.data("nodeSize"),
        });
      });
    }
  }, [colorMode, centralityData]);

  // Handle path highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all path classes
    cy.nodes().removeClass("path-node path-dimmed");
    cy.edges().removeClass("path-edge path-dimmed");

    if (pathHighlight && (pathHighlight.nodeIds.size > 0 || pathHighlight.edgeIds.size > 0)) {
      // Apply path highlighting
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

  // Handle multi-select highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all multi-select classes
    cy.nodes().removeClass("multi-selected");

    if (selectedGeneIds && selectedGeneIds.size > 0) {
      cy.nodes().forEach((node) => {
        if (selectedGeneIds.has(node.id())) {
          node.addClass("multi-selected");
        }
      });
    }
  }, [selectedGeneIds]);

  // Handle shared interactor highlighting
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all shared interactor classes
    cy.nodes().removeClass("shared-interactor");

    if (sharedInteractorIds && sharedInteractorIds.size > 0) {
      cy.nodes().forEach((node) => {
        if (sharedInteractorIds.has(node.id())) {
          node.addClass("shared-interactor");
        }
      });
    }
  }, [sharedInteractorIds]);

  // Handle layout changes only
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;

    // Guard against destroyed Cytoscape instance
    if (cy.destroyed()) return;
    if (layoutRef.current === layout) return;

    layoutRef.current = layout;
    const layoutOptions = getLayoutOptions(layout);
    cy.layout(layoutOptions).run();
  }, [layout]);

  // Memoize elements key to detect changes (nodes only for comparison)
  const elementsKey = useMemo(
    () =>
      elements
        .filter((el) => !el.data.source)
        .map((el) => el.data.id)
        .sort()
        .join(","),
    [elements]
  );

  // Track previous element count for forced layout re-run on limit change
  const prevElementCountRef = useRef(elements.length);

  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;

    // Guard against destroyed Cytoscape instance
    if (cy.destroyed()) return;

    // Detect if element count changed (e.g., limit dropdown changed)
    const elementCountChanged = elements.length !== prevElementCountRef.current;
    prevElementCountRef.current = elements.length;

    const currentIds = cy.nodes().map((n) => n.id()).sort().join(",");

    // Re-run layout if node IDs changed OR element count changed
    if (currentIds !== elementsKey || elementCountChanged) {
      cy.elements().remove();
      cy.add(elements);

      // Apply edge styles after adding elements
      cy.batch(() => {
        cy.edges().forEach((edge) => {
          const numSources = edge.data("numSources") ?? 1;
          const sources = Math.max(1, Math.min(numSources, 4));

          let color: string;
          let width: number;

          if (sources >= 4) {
            color = "#475569";
            width = 4;
          } else if (sources >= 3) {
            color = "#64748b";
            width = 3;
          } else if (sources >= 2) {
            color = "#94a3b8";
            width = 2;
          } else {
            color = "#cbd5e1";
            width = 1;
          }

          edge.style({
            "line-color": color,
            "width": width,
            "opacity": 0.7,
            "curve-style": "bezier",
          });
        });
      });

      const layoutOptions = getLayoutOptions(layout);
      cy.layout(layoutOptions).run();
    }
  }, [elementsKey, elements, layout]);

  // Cy callback - runs when CytoscapeComponent initializes or reinitializes
  const handleCy = (cy: Core) => {
    // Skip if same instance is already initialized
    if (initializedRef.current && cyRef.current === cy) return;

    // Store the new instance
    cyRef.current = cy;
    initializedRef.current = true;

    // Manually apply stylesheet - react-cytoscapejs doesn't reliably apply stylesheet prop
    cy.style().fromJson(STYLESHEET).update();

    // Manually apply edge styles based on numSources (like reference biogrid code)
    cy.batch(() => {
      cy.edges().forEach((edge) => {
        const numSources = edge.data("numSources") ?? 1;
        const sources = Math.max(1, Math.min(numSources, 4));

        let color: string;
        let width: number;

        if (sources >= 4) {
          color = "#475569";  // slate-600
          width = 4;
        } else if (sources >= 3) {
          color = "#64748b";  // slate-500
          width = 3;
        } else if (sources >= 2) {
          color = "#94a3b8";  // slate-400
          width = 2;
        } else {
          color = "#cbd5e1";  // slate-300
          width = 1;
        }

        edge.style({
          "line-color": color,
          "width": width,
          "opacity": 0.7,
          "curve-style": "bezier",
          "target-arrow-shape": "none",
        });
      });
    });

    // Initial layout
    const layoutOptions = getLayoutOptions(layoutRef.current);
    cy.layout(layoutOptions).run();

    // Node click handler - uses ref so always has latest callback
    // Extract originalEvent to pass Cmd/Ctrl key state for multi-select
    cy.on("tap", "node", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const originalEvent = event.originalEvent as MouseEvent | undefined;
      onNodeClickRef.current?.(nodeToData(data), originalEvent);
    });

    // Edge click handler
    cy.on("tap", "edge", (event: EventObject) => {
      const edge = event.target as EdgeSingular;
      const edgeId = edge.id();
      const midpoint = edge.midpoint();
      const container = cy.container();

      if (container && onEdgeClickRef.current) {
        const rect = container.getBoundingClientRect();
        const pan = cy.pan();
        const zoom = cy.zoom();

        // Convert model position to rendered position
        const renderedX = midpoint.x * zoom + pan.x;
        const renderedY = midpoint.y * zoom + pan.y;

        onEdgeClickRef.current(edgeId, {
          x: rect.left + renderedX,
          y: rect.top + renderedY,
        });
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
        onNodeHoverRef.current?.(nodeToData(data), {
          x: rect.left + renderedPosition.x,
          y: rect.top + renderedPosition.y,
        });
      }
    });

    cy.on("mouseout", "node", () => {
      onNodeHoverRef.current?.(null, null);
    });

    // Change cursor on edge hover
    cy.on("mouseover", "edge", () => {
      const container = cy.container();
      if (container) {
        container.style.cursor = "pointer";
      }
    });

    cy.on("mouseout", "edge", () => {
      const container = cy.container();
      if (container) {
        container.style.cursor = "default";
      }
    });

    // Fit graph to viewport after layout
    cy.on("layoutstop", () => {
      cy.fit(undefined, 40);
    });
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        className="w-full h-full"
        cy={handleCy}
        wheelSensitivity={0.3}
        minZoom={0.3}
        maxZoom={2}
        boxSelectionEnabled={false}
        autounselectify={false}
      />
    </div>
  );
}

// Memoize the entire component to prevent re-renders when parent state changes
export const PPICytoscapeGraph = memo(PPICytoscapeGraphInner);
