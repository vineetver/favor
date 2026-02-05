"use client";

import { cn } from "@infra/utils";
import cytoscape, {
  type Core,
  type EventObject,
  type NodeSingular,
  type StylesheetStyle,
} from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import dagre from "cytoscape-dagre";
import { memo, useEffect, useMemo, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import {
  type GraphNode,
  getPathwayLayoutOptions,
  type PathwayCytoscapeGraphProps,
  type PathwayNode,
} from "./types";

// Register layout extensions (only once)
if (typeof cytoscape("layout", "cose-bilkent") === "undefined") {
  cytoscape.use(coseBilkent);
}
if (typeof cytoscape("layout", "dagre") === "undefined") {
  cytoscape.use(dagre);
}

const STYLESHEET: StylesheetStyle[] = [
  // Gene node (seed) - prominent center node
  {
    selector: "node[type='gene']",
    style: {
      "background-color": "#6366f1",
      "border-color": "#4f46e5",
      "border-width": 3,
      width: "data(nodeSize)",
      height: "data(nodeSize)",
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center",
      "font-size": 14,
      "font-weight": 700,
      color: "#ffffff",
      "text-outline-color": "#4f46e5",
      "text-outline-width": 2,
      shape: "ellipse",
    },
  },
  // Pathway node
  {
    selector: "node[type='pathway']",
    style: {
      "background-color": "data(backgroundColor)",
      "border-color": "data(borderColor)",
      "border-width": 2,
      width: "data(nodeSize)",
      height: "data(nodeSize)",
      label: "data(label)",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 4,
      "font-size": 9,
      "font-weight": 500,
      color: "#334155",
      "text-outline-color": "#ffffff",
      "text-outline-width": 1.5,
      shape: "round-rectangle",
      "text-max-width": "90px",
      "text-wrap": "ellipsis",
    },
  },
  // Selected state
  {
    selector: "node.selected",
    style: {
      "border-width": 4,
      "border-color": "#1e40af",
      "z-index": 10,
    },
  },
  // Hover state
  {
    selector: "node:active",
    style: {
      "overlay-opacity": 0.1,
      "overlay-color": "#6366f1",
    },
  },
  // PARTICIPATES_IN edge (Gene -> Pathway)
  {
    selector: "edge[type='participates_in']",
    style: {
      width: 1.5,
      "line-color": "#94a3b8",
      "curve-style": "bezier",
      opacity: 0.6,
      "target-arrow-shape": "triangle",
      "target-arrow-color": "#94a3b8",
      "arrow-scale": 0.7,
    },
  },
  // PART_OF edge (Pathway hierarchy)
  {
    selector: "edge[type='part_of']",
    style: {
      width: 1,
      "line-color": "#cbd5e1",
      "line-style": "dashed",
      "curve-style": "bezier",
      opacity: 0.4,
      "target-arrow-shape": "triangle",
      "target-arrow-color": "#cbd5e1",
      "arrow-scale": 0.5,
    },
  },
];

function PathwayCytoscapeGraphInner({
  elements,
  layout,
  selectedNodeId,
  onNodeClick,
  onNodeHover,
}: PathwayCytoscapeGraphProps) {
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef(layout);
  const initializedRef = useRef(false);

  // Store callbacks in refs to avoid re-bindings
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);

  // Reset initialization state on unmount
  useEffect(() => {
    return () => {
      initializedRef.current = false;
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  useEffect(() => {
    onNodeHoverRef.current = onNodeHover;
  }, [onNodeHover]);

  // Handle selected node highlighting (imperative via cy API)
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    cy.nodes().removeClass("selected");
    if (selectedNodeId) {
      cy.getElementById(selectedNodeId).addClass("selected");
    }
  }, [selectedNodeId]);

  // Handle layout changes
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;
    if (layoutRef.current === layout) return;

    layoutRef.current = layout;
    cy.layout(getPathwayLayoutOptions(layout)).run();
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

  // Handle element changes imperatively
  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    // Detect if element count changed (e.g., limit dropdown changed)
    const elementCountChanged = elements.length !== prevElementCountRef.current;
    prevElementCountRef.current = elements.length;

    const currentIds = cy
      .nodes()
      .map((n) => n.id())
      .sort()
      .join(",");

    // Re-run layout if node IDs changed OR element count changed
    if (currentIds !== elementsKey || elementCountChanged) {
      cy.elements().remove();
      cy.add(elements);
      cy.layout(getPathwayLayoutOptions(layout)).run();
    }
  }, [elementsKey, elements, layout]);

  // Cy callback - runs when CytoscapeComponent initializes or reinitializes
  const handleCy = (cy: Core) => {
    // Skip if same instance is already initialized
    if (initializedRef.current && cyRef.current === cy) return;

    // Store the new instance
    cyRef.current = cy;
    initializedRef.current = true;

    // Run initial layout
    const layoutOptions = getPathwayLayoutOptions(layoutRef.current);
    cy.layout(layoutOptions).run();

    // Node click handler - uses ref so always has latest callback
    cy.on("tap", "node", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();

      const graphNode: GraphNode =
        data.type === "gene"
          ? { type: "gene", id: data.id, label: data.label }
          : {
              type: "pathway",
              data: {
                id: data.id,
                name: data.fullLabel ?? data.label,
                category: data.category,
                url: data.url,
                source: data.source,
              },
            };

      onNodeClickRef.current(graphNode);
    });

    // Node hover handlers
    cy.on("mouseover", "node[type='pathway']", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const pos = node.renderedPosition();
      const container = cy.container();

      if (container) {
        const rect = container.getBoundingClientRect();
        const pathwayNode: PathwayNode = {
          id: data.id,
          name: data.fullLabel ?? data.label,
          category: data.category,
          url: data.url,
          source: data.source,
        };
        onNodeHoverRef.current(pathwayNode, {
          x: rect.left + pos.x,
          y: rect.top + pos.y,
        });
      }
    });

    cy.on("mouseout", "node", () => {
      onNodeHoverRef.current(null, null);
    });

    // Fit after layout
    cy.on("layoutstop", () => {
      cy.fit(undefined, 50);
    });
  };

  return (
    <div className={cn("relative w-full h-full min-h-[500px]")}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={STYLESHEET}
        className="w-full h-full"
        cy={handleCy}
        wheelSensitivity={0.3}
        minZoom={0.2}
        maxZoom={2.5}
        boxSelectionEnabled={false}
        autounselectify={false}
      />
    </div>
  );
}

export const PathwayCytoscapeGraph = memo(PathwayCytoscapeGraphInner);
