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
import {
  getLayoutOptions,
  type PPICytoscapeGraphProps,
  type CentralityData,
  type EdgeFilterState,
  type EdgeFilterConfig,
  type ClusterState,
  DEFAULT_EDGE_FILTER,
} from "./types";
import { getClusterColor } from "../../utils/clustering";

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
  // Base edge style - fallback values, actual colors applied programmatically
  {
    selector: "edge.ppi-edge",
    style: {
      "curve-style": "bezier",
      opacity: 0.7,
      "target-arrow-shape": "none",
      "line-color": "#cbd5e1",  // Fallback, overridden by applyEdgeStyles
      width: 1,                  // Fallback, overridden by applyEdgeStyles
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
  // Edge filter: greyed out edges below threshold
  {
    selector: "edge.ppi-edge.filter-greyed",
    style: {
      "line-color": "#e2e8f0",  // slate-200
      opacity: 0.3,
      width: 1,
      "z-index": 1,
    },
  },
  // Edge filter: hidden edges (via display: none alternative)
  {
    selector: "edge.ppi-edge.filter-hidden",
    style: {
      opacity: 0,
      "events": "no" as never,
    },
  },
  // Context overlay: node halo for shared pathways
  {
    selector: "node.overlay-pathways",
    style: {
      "border-width": 4,
      "border-color": "#6366f1",  // indigo-500
      "border-opacity": 0.7,
    },
  },
  // Context overlay: node halo for shared diseases
  {
    selector: "node.overlay-diseases",
    style: {
      "border-width": 4,
      "border-color": "#f43f5e",  // rose-500
      "border-opacity": 0.7,
    },
  },
  // Hub mode: hidden nodes below threshold
  {
    selector: "node.hub-hidden",
    style: {
      opacity: 0,
      "events": "no" as never,
    },
  },
  // Cluster visualization styles (8 distinct colors)
  {
    selector: "node.cluster-0",
    style: {
      "background-color": "#dbeafe",
      "border-color": "#3b82f6",
    },
  },
  {
    selector: "node.cluster-1",
    style: {
      "background-color": "#dcfce7",
      "border-color": "#22c55e",
    },
  },
  {
    selector: "node.cluster-2",
    style: {
      "background-color": "#fef3c7",
      "border-color": "#f59e0b",
    },
  },
  {
    selector: "node.cluster-3",
    style: {
      "background-color": "#fce7f3",
      "border-color": "#ec4899",
    },
  },
  {
    selector: "node.cluster-4",
    style: {
      "background-color": "#e0e7ff",
      "border-color": "#6366f1",
    },
  },
  {
    selector: "node.cluster-5",
    style: {
      "background-color": "#ffedd5",
      "border-color": "#f97316",
    },
  },
  {
    selector: "node.cluster-6",
    style: {
      "background-color": "#f3e8ff",
      "border-color": "#a855f7",
    },
  },
  {
    selector: "node.cluster-7",
    style: {
      "background-color": "#ccfbf1",
      "border-color": "#14b8a6",
    },
  },
  // Hide-cascade mode: hidden orphan nodes
  {
    selector: "node.cascade-hidden",
    style: {
      opacity: 0,
      "events": "no" as never,
    },
  },
];

/**
 * Apply edge styles based on source count data stored in element data.
 * This is needed because react-cytoscapejs doesn't reliably support data() mappers.
 */
function applyEdgeStyles(cy: Core): void {
  cy.edges(".ppi-edge").forEach((edge) => {
    const lineColor = edge.data("lineColor");
    const edgeWidth = edge.data("edgeWidth");
    if (lineColor && edgeWidth) {
      edge.style({
        "line-color": lineColor,
        width: edgeWidth,
      });
    }
  });
}

function PPICytoscapeGraphInner({
  elements,
  layout,
  seedGeneId,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
  selectedEdgeId,
  colorMode = "experiments",
  centralityData,
  pathHighlight,
  selectedGeneIds,
  sharedInteractorIds,
  edgeFilter = DEFAULT_EDGE_FILTER,
  edgeFilterConfig,
  overlayData,
  overlayType = "none",
  hubMode,
  clusterState,
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

  // Handle edge filtering
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all filter classes
    cy.edges().removeClass("filter-greyed filter-hidden");

    // Apply filter to edges
    cy.edges().forEach((edge) => {
      const numSources = edge.data("numSources") ?? 0;
      const numExperiments = edge.data("numExperiments") ?? 0;

      const belowThreshold =
        numSources < edgeFilter.minSources ||
        numExperiments < edgeFilter.minExperiments;

      if (belowThreshold) {
        if (edgeFilter.greyOutBelowThreshold) {
          edge.addClass("filter-greyed");
        } else {
          edge.addClass("filter-hidden");
        }
      }
    });
  }, [edgeFilter]);

  // Handle context overlay (node halos)
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all overlay classes
    cy.nodes().removeClass("overlay-pathways overlay-diseases");

    if (overlayType !== "none" && overlayData && overlayData.size > 0) {
      cy.nodes().forEach((node) => {
        const data = overlayData.get(node.id());
        if (data && data.sharedCount > 0) {
          if (overlayType === "shared-pathways") {
            node.addClass("overlay-pathways");
          } else if (overlayType === "shared-diseases") {
            node.addClass("overlay-diseases");
          }
        }
      });
    }
  }, [overlayType, overlayData]);

  // Handle hub mode (centrality filtering)
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all hub mode classes
    cy.nodes().removeClass("hub-hidden");
    cy.edges().removeClass("filter-hidden");

    if (hubMode?.showHubsOnly && centralityData && centralityData.size > 0) {
      const threshold = hubMode.hubThreshold;

      // Hide nodes below percentile threshold (except seed)
      cy.nodes().forEach((node) => {
        const isSeed = node.data("isSeed");
        if (isSeed) return; // Never hide seed

        const nodeData = centralityData.get(node.id());
        if (!nodeData || nodeData.percentile.total < threshold) {
          node.addClass("hub-hidden");
        }
      });

      // Hide edges connected to hidden nodes
      cy.edges().forEach((edge) => {
        const sourceHidden = edge.source().hasClass("hub-hidden");
        const targetHidden = edge.target().hasClass("hub-hidden");
        if (sourceHidden || targetHidden) {
          edge.addClass("filter-hidden");
        }
      });
    }
  }, [hubMode, centralityData]);

  // Handle cluster visualization
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all cluster classes
    for (let i = 0; i < 8; i++) {
      cy.nodes().removeClass(`cluster-${i}`);
    }

    if (clusterState?.enabled && clusterState.clusters.size > 0) {
      // Build a reverse map: nodeId -> clusterIndex
      const nodeToCluster = new Map<string, number>();
      let clusterIndex = 0;

      clusterState.clusters.forEach((nodeIds) => {
        nodeIds.forEach((nodeId) => {
          nodeToCluster.set(nodeId, clusterIndex);
        });
        clusterIndex++;
      });

      // Apply cluster classes to nodes
      cy.nodes().forEach((node) => {
        const clusterId = nodeToCluster.get(node.id());
        if (clusterId !== undefined) {
          // Use modulo 8 to cycle through available cluster colors
          node.addClass(`cluster-${clusterId % 8}`);
        }
      });
    }
  }, [clusterState]);

  // Handle edge filter with cascade mode
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Clear all cascade-hidden classes (different from filter-hidden)
    cy.nodes().removeClass("cascade-hidden");

    // Only apply cascade logic if edgeFilterConfig is provided with hide-cascade
    if (!edgeFilterConfig || edgeFilterConfig.display !== "hide-cascade") return;
    if (edgeFilterConfig.minSources === 0 && edgeFilterConfig.minExperiments === 0) return;

    // Find nodes connected by visible edges
    const connectedNodes = new Set<string>();
    if (seedGeneId) connectedNodes.add(seedGeneId); // Seed is always visible

    cy.edges().forEach((edge) => {
      // Skip edges that are already hidden by filter
      if (edge.hasClass("filter-greyed") || edge.hasClass("filter-hidden")) return;

      const numSources = edge.data("numSources") ?? 0;
      const numExperiments = edge.data("numExperiments") ?? 0;

      const passesFilter =
        numSources >= edgeFilterConfig.minSources &&
        numExperiments >= edgeFilterConfig.minExperiments;

      if (passesFilter) {
        connectedNodes.add(edge.source().id());
        connectedNodes.add(edge.target().id());
      }
    });

    // Hide orphaned nodes (nodes not connected by any visible edge)
    cy.nodes().forEach((node) => {
      if (!connectedNodes.has(node.id())) {
        node.addClass("cascade-hidden");
      }
    });
  }, [edgeFilterConfig, seedGeneId]);

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

      // Apply edge styles from element data (data mappers don't work reliably with react-cytoscapejs)
      applyEdgeStyles(cy);

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

    // Apply edge styles from element data (data mappers don't work reliably with react-cytoscapejs)
    applyEdgeStyles(cy);

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
