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
import type { ExplorerCytoscapeProps } from "../types/props";
import type { ExplorerNode, ExplorerEdge } from "../types/node";
import { getExplorerLayoutOptions } from "../config/layout";
import { NODE_TYPE_COLORS } from "../config/styling";

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
    selector: "node.seed",
    style: {
      "border-width": 3,
      "font-weight": 600,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#1e40af",
    },
  },
  {
    selector: "node.multi-selected",
    style: {
      "border-width": 3,
      "border-color": "#9333ea",
      "border-style": "double" as never,
    },
  },
  {
    selector: "node.path-node",
    style: {
      "border-width": 4,
      "border-color": "#f59e0b",
      "z-index": 100,
    },
  },
  {
    selector: "node.path-dimmed",
    style: {
      opacity: 0.3,
    },
  },
  {
    selector: "node.entity-gene",
    style: {
      "background-color": NODE_TYPE_COLORS.Gene.background,
      "border-color": NODE_TYPE_COLORS.Gene.border,
      color: NODE_TYPE_COLORS.Gene.text,
    },
  },
  {
    selector: "node.entity-disease",
    style: {
      "background-color": NODE_TYPE_COLORS.Disease.background,
      "border-color": NODE_TYPE_COLORS.Disease.border,
      color: NODE_TYPE_COLORS.Disease.text,
    },
  },
  {
    selector: "node.entity-drug",
    style: {
      "background-color": NODE_TYPE_COLORS.Drug.background,
      "border-color": NODE_TYPE_COLORS.Drug.border,
      color: NODE_TYPE_COLORS.Drug.text,
    },
  },
  {
    selector: "node.entity-pathway",
    style: {
      "background-color": NODE_TYPE_COLORS.Pathway.background,
      "border-color": NODE_TYPE_COLORS.Pathway.border,
      color: NODE_TYPE_COLORS.Pathway.text,
    },
  },
  {
    selector: "node.entity-variant",
    style: {
      "background-color": NODE_TYPE_COLORS.Variant.background,
      "border-color": NODE_TYPE_COLORS.Variant.border,
      color: NODE_TYPE_COLORS.Variant.text,
    },
  },
  {
    selector: "node.entity-trait",
    style: {
      "background-color": NODE_TYPE_COLORS.Trait.background,
      "border-color": NODE_TYPE_COLORS.Trait.border,
      color: NODE_TYPE_COLORS.Trait.text,
    },
  },
  {
    selector: "node.entity-phenotype",
    style: {
      "background-color": NODE_TYPE_COLORS.Phenotype.background,
      "border-color": NODE_TYPE_COLORS.Phenotype.border,
      color: NODE_TYPE_COLORS.Phenotype.text,
    },
  },
  {
    selector: "node.entity-study",
    style: {
      "background-color": NODE_TYPE_COLORS.Study.background,
      "border-color": NODE_TYPE_COLORS.Study.border,
      color: NODE_TYPE_COLORS.Study.text,
    },
  },
  {
    selector: "node.entity-goterm",
    style: {
      "background-color": NODE_TYPE_COLORS.GOTerm.background,
      "border-color": NODE_TYPE_COLORS.GOTerm.border,
      color: NODE_TYPE_COLORS.GOTerm.text,
    },
  },
  {
    selector: "node.entity-sideeffect",
    style: {
      "background-color": NODE_TYPE_COLORS.SideEffect.background,
      "border-color": NODE_TYPE_COLORS.SideEffect.border,
      color: NODE_TYPE_COLORS.SideEffect.text,
    },
  },
  {
    selector: "node.entity-ontologyterm",
    style: {
      "background-color": NODE_TYPE_COLORS.OntologyTerm.background,
      "border-color": NODE_TYPE_COLORS.OntologyTerm.border,
      color: NODE_TYPE_COLORS.OntologyTerm.text,
    },
  },
  {
    selector: "node.entity-ccre",
    style: {
      "background-color": NODE_TYPE_COLORS.cCRE.background,
      "border-color": NODE_TYPE_COLORS.cCRE.border,
      color: NODE_TYPE_COLORS.cCRE.text,
    },
  },
  {
    selector: "node.entity-metabolite",
    style: {
      "background-color": NODE_TYPE_COLORS.Metabolite.background,
      "border-color": NODE_TYPE_COLORS.Metabolite.border,
      color: NODE_TYPE_COLORS.Metabolite.text,
    },
  },
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
  {
    selector: "edge:hover",
    style: {
      opacity: 1,
      width: 3,
      "z-index": 10,
    },
  },
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
  {
    selector: "edge.path-dimmed",
    style: {
      opacity: 0.2,
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function dataToNode(data: Record<string, unknown>): ExplorerNode {
  return {
    id: String(data.id ?? ""),
    key: "" as ExplorerNode["key"],
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

function dataToEdge(data: Record<string, unknown>): ExplorerEdge {
  return {
    id: String(data.id ?? ""),
    key: "" as ExplorerEdge["key"],
    type: String(data.type ?? "ASSOCIATED_WITH_DISEASE") as ExplorerEdge["type"],
    sourceId: String(data.source ?? ""),
    targetId: String(data.target ?? ""),
    sourceKey: "" as ExplorerEdge["sourceKey"],
    targetKey: "" as ExplorerEdge["targetKey"],
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

  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onEdgeClickRef = useRef(onEdgeClick);
  const onBackgroundClickRef = useRef(onBackgroundClick);

  useEffect(() => {
    return () => {
      initializedRef.current = false;
      cyRef.current = null;
    };
  }, []);

  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeHoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { onEdgeClickRef.current = onEdgeClick; }, [onEdgeClick]);
  useEffect(() => { onBackgroundClickRef.current = onBackgroundClick; }, [onBackgroundClick]);

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

  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;
    if (layoutRef.current === layout) return;

    layoutRef.current = layout;
    const layoutOptions = getExplorerLayoutOptions(layout);
    cy.layout(layoutOptions).run();
  }, [layout]);

  const elementsKey = useMemo(
    () =>
      elements
        .map((el) => el.data.id)
        .sort()
        .join(","),
    [elements]
  );

  const prevElementCountRef = useRef(elements.length);

  useEffect(() => {
    if (!cyRef.current || !initializedRef.current) return;
    const cy = cyRef.current;
    if (cy.destroyed()) return;

    const currentElementIds = cy.elements().map((el) => el.id()).sort().join(",");
    const elementCountChanged = elements.length !== prevElementCountRef.current;
    prevElementCountRef.current = elements.length;

    if (currentElementIds !== elementsKey || elementCountChanged) {
      cy.elements().remove();
      cy.add(elements);

      const layoutOptions = getExplorerLayoutOptions(layout);
      cy.layout(layoutOptions).run();
    }
  }, [elementsKey, elements, layout]);

  const handleCy = (cy: Core) => {
    if (initializedRef.current && cyRef.current === cy) return;

    cyRef.current = cy;
    initializedRef.current = true;

    cy.style().fromJson(STYLESHEET).update();

    const layoutOptions = getExplorerLayoutOptions(layoutRef.current);
    cy.layout(layoutOptions).run();

    cy.on("tap", "node", (event: EventObject) => {
      const node = event.target as NodeSingular;
      const data = node.data();
      const originalEvent = event.originalEvent as MouseEvent | undefined;
      onNodeClickRef.current?.(dataToNode(data), originalEvent);
    });

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

    cy.on("tap", (event: EventObject) => {
      if (event.target === cy) {
        onBackgroundClickRef.current?.();
      }
    });

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

    cy.on("mouseover", "node, edge", () => {
      const container = cy.container();
      if (container) container.style.cursor = "pointer";
    });

    cy.on("mouseout", "node, edge", () => {
      const container = cy.container();
      if (container) container.style.cursor = "default";
    });

    cy.on("layoutstop", () => {
      cy.fit(undefined, 40);
    });
  };

  return (
    <div className={cn("relative w-full h-full bg-muted", className)}>
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

export const ExplorerCytoscape = memo(ExplorerCytoscapeInner);
