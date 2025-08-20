import cytoscape, {
  Core,
  ElementsDefinition,
  EdgeSingular,
  NodeSingular,
} from "cytoscape";
import { CytoscapeEdgeData, CytoscapeNodeData, PPINetworkInteraction } from "./types";

export const LAYOUT_OPTIONS = {
  "cose-bilkent": {
    name: "cose-bilkent",
    quality: "default",
    nodeDimensionsIncludeLabels: true,
    randomize: false,
    packComponents: true,
    nodeRepulsion: 4500,
    idealEdgeLength: 120,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 2500,
    tile: true,
    animate: "end",
    animationDuration: 1000,
  },
  cola: {
    name: "cola",
    animate: true,
    animationDuration: 1000,
    randomize: true,
    maxSimulationTime: 2000,
    ungrabifyWhileSimulating: false,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    edgeLength: function (edge: EdgeSingular) {
      return 100 + Math.random() * 50;
    },
    avoidOverlap: true,
    handleDisconnected: true,
    convergenceThreshold: 0.01,
    nodeSpacing: function (node: NodeSingular) {
      return 20 + node.data("degree") * 5;
    },
    unconstrIter: 200,
    userConstIter: 50,
    allConstIter: 100,
  },
  circle: {
    name: "circle",
    fit: true,
    padding: 30,
    radius: 200,
    animate: true,
    animationDuration: 1000,
  },
} as const;

export type LayoutType = keyof typeof LAYOUT_OPTIONS;

export function createCytoscapeElements(
  interactions: PPINetworkInteraction[],
  interactionLimit: number,
  showAllInteractions: boolean,
  filterByMethod: string,
  filterByInteractionType: string,
): ElementsDefinition {
  const nodes: cytoscape.NodeDefinition[] = [];
  const edges: cytoscape.EdgeDefinition[] = [];
  const nodeMap = new Set<string>();

  let filteredInteractions = interactions;

  // Apply filters with fallback mechanism
  const originalLength = filteredInteractions.length;

  if (filterByMethod !== "all") {
    filteredInteractions = filteredInteractions.filter(
      (i) => i.method && i.method === filterByMethod,
    );
  }

  if (filterByInteractionType !== "all") {
    filteredInteractions = filteredInteractions.filter(
      (i) =>
        i.interaction_type && i.interaction_type === filterByInteractionType,
    );
  }

  // Fallback mechanism: if both filters result in zero data, try each filter individually
  if (
    filteredInteractions.length === 0 &&
    (filterByMethod !== "all" || filterByInteractionType !== "all")
  ) {
    console.warn(
      "Filter combination resulted in zero interactions. Applying fallback mechanism.",
    );

    // Try method filter only
    if (filterByMethod !== "all") {
      filteredInteractions = interactions.filter(
        (i) => i.method && i.method === filterByMethod,
      );
    }

    // If still zero, try interaction type filter only
    if (
      filteredInteractions.length === 0 &&
      filterByInteractionType !== "all"
    ) {
      filteredInteractions = interactions.filter(
        (i) =>
          i.interaction_type && i.interaction_type === filterByInteractionType,
      );
    }

    // If still zero, use all interactions
    if (filteredInteractions.length === 0) {
      filteredInteractions = interactions;
      console.warn(
        "All filters resulted in zero data. Showing all interactions.",
      );
    }
  }

  const limitedInteractions = showAllInteractions
    ? filteredInteractions
    : filteredInteractions.slice(0, interactionLimit);

  const geneConnectivity = new Map<string, number>();
  const geneDetails = new Map<string, any>();

  limitedInteractions.forEach((interaction) => {
    const geneA = interaction.gene_interactor_a;
    const geneB = interaction.gene_interactor_b;

    // Skip interactions with empty gene names
    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    geneConnectivity.set(geneA, (geneConnectivity.get(geneA) || 0) + 1);
    geneConnectivity.set(geneB, (geneConnectivity.get(geneB) || 0) + 1);

    if (!geneDetails.has(geneA))
      geneDetails.set(geneA, {
        interactions: [],
        methods: new Set(),
        types: new Set(),
      });
    if (!geneDetails.has(geneB))
      geneDetails.set(geneB, {
        interactions: [],
        methods: new Set(),
        types: new Set(),
      });

    geneDetails.get(geneA).interactions.push(interaction);
    geneDetails.get(geneB).interactions.push(interaction);
    geneDetails.get(geneA).methods.add(interaction.method);
    geneDetails.get(geneB).methods.add(interaction.method);
    geneDetails.get(geneA).types.add(interaction.interaction_type);
    geneDetails.get(geneB).types.add(interaction.interaction_type);
  });

  const sortedGenes = Array.from(geneConnectivity.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const queryGene = sortedGenes[0]?.[0];
  const maxDegree = sortedGenes[0]?.[1] || 1;

  // Create nodes for all genes
  const allGenes = new Set<string>();
  Array.from(geneConnectivity.entries()).forEach(([gene, degree]) => {
    allGenes.add(gene);
  });

  // Create gene nodes
  Array.from(allGenes).forEach((gene) => {
    const degree = geneConnectivity.get(gene) || 1;
    const isQueryGene = gene === queryGene;
    const details = geneDetails.get(gene);
    const baseSize = isQueryGene ? 80 : 60;
    const sizeMultiplier = Math.sqrt(degree / maxDegree);
    const width = Math.max(baseSize, baseSize + sizeMultiplier * 40);
    const height = Math.max(35, 35 + sizeMultiplier * 15);

    // Three-tier color scheme: Query, Highly Connected, Regular
    let backgroundColor = "#6366f1"; // Blue for regular interacting genes
    let borderColor = "#ffffff";

    if (isQueryGene) {
      backgroundColor = "#ef4444"; // Red for query gene
      borderColor = "#dc2626";
    } else if (degree > 2) {
      backgroundColor = "#f59e0b"; // Amber for highly connected genes
      borderColor = "#d97706";
    }

    const nodeLabel = gene;

    nodes.push({
      data: {
        id: gene,
        label: nodeLabel,
        type: "gene",
        degree: degree,
        isQueryGene: isQueryGene,
        interactions: details?.interactions || [],
        methods: Array.from(details?.methods || []),
        interactionTypes: Array.from(details?.types || []),
      } as CytoscapeNodeData,
      classes: isQueryGene ? "gene query-gene" : "gene",
      style: {
        width: width,
        height: height,
        "background-color": backgroundColor,
        "border-color": borderColor,
        color: "#ffffff",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": isQueryGene ? "12px" : "10px",
        "font-weight": 500,
        "border-width": isQueryGene ? 3 : 2,
        opacity: 1,
      },
    });
    nodeMap.add(gene);
  });

  // Group interactions by gene pair AND interaction type for meta-edges
  const interactionGroups = new Map<
    string,
    Map<string, PPINetworkInteraction[]>
  >();

  limitedInteractions.forEach((interaction) => {
    const geneA = interaction.gene_interactor_a;
    const geneB = interaction.gene_interactor_b;

    // Include all edges

    const pairKey = [geneA, geneB].sort().join("|");
    const interactionType = interaction.interaction_type || "unknown";

    if (!interactionGroups.has(pairKey)) {
      interactionGroups.set(pairKey, new Map());
    }
    if (!interactionGroups.get(pairKey)!.has(interactionType)) {
      interactionGroups.get(pairKey)!.set(interactionType, []);
    }
    interactionGroups.get(pairKey)!.get(interactionType)!.push(interaction);
  });

  // Create meta-edges grouped by interaction type
  Array.from(interactionGroups.entries()).forEach(([pairKey, typeGroups]) => {
    const [geneA, geneB] = pairKey.split("|");

    // Skip if gene names are invalid
    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    // Create one edge per interaction type with stroke pattern and width encoding
    Array.from(typeGroups.entries()).forEach(
      ([interactionType, interactions], typeIndex) => {
        const methods = Array.from(
          new Set(interactions.map((i) => i.method).filter(Boolean)),
        );
        const publications = Array.from(
          new Set(interactions.map((i) => i.publication).filter(Boolean)),
        );

        // Calculate average confidence for this type group
        const confidenceValues = interactions
          .map((i) => i.confidence)
          .filter((c) => typeof c === "number" && !isNaN(c) && c >= 0);
        const avgConfidence =
          confidenceValues && confidenceValues.length > 0
            // @ts-ignore - Checked for undefined above
            ? confidenceValues.reduce((sum, conf) => (sum ?? 0) + (conf ?? 0), 0) /
              confidenceValues.length
            : 0.5;

        // Determine stroke pattern based on interaction type
        let lineStyle = "solid";
        let dashPattern: number[] | undefined;

        if (interactionType.toLowerCase().includes("direct")) {
          lineStyle = "solid";
          dashPattern = undefined;
        } else if (
          interactionType.toLowerCase().includes("physical") ||
          interactionType.toLowerCase().includes("association")
        ) {
          lineStyle = "dashed";
          dashPattern = [10, 6];
        } else if (
          interactionType.toLowerCase().includes("complex") ||
          typeGroups.size >= 2
        ) {
          lineStyle = "dotted";
          dashPattern = [3, 5];
        }

        // Log-scaled width based on number of detection methods (1-6px)
        const methodCount = methods.length;
        let edgeWidth;
        if (methodCount === 1) {
          edgeWidth = 1;
        } else if (methodCount === 2) {
          edgeWidth = 2.5;
        } else if (methodCount >= 4) {
          edgeWidth = 6;
        } else {
          edgeWidth = 2.5 + Math.log2(methodCount - 1) * 1.5;
        }

        const edgeColor = "#6366f1"; // Single blue color for all edges
        const edgeOpacity = Math.max(
          0.6,
          Math.min(0.9, 0.6 + avgConfidence * 0.3),
        );

        edges.push({
          data: {
            id: `interaction-${pairKey}-${interactionType}-${typeIndex}`,
            source: geneA,
            target: geneB,
            methods: methods,
            interactionTypes: [interactionType],
            publications: publications,
            studyCount: interactions.length,
            confidence: avgConfidence,
            type: "interaction",
            allInteractions: interactions,
          } as CytoscapeEdgeData,
          classes: `interaction ${interactionType.replace(/\s+/g, "-")}`,
          style: {
            "line-color": edgeColor,
            width: edgeWidth,
            opacity: edgeOpacity,
            "curve-style": "bezier",
            "line-style": lineStyle,
            "line-dash-pattern": dashPattern,
            "control-point-step-size": 40,
            "control-point-distances": [15, -15],
            "control-point-weights": [0.3, 0.7],
          },
        });
      },
    );
  });

  return { nodes, edges };
}

export function calculateAdaptiveZoom(
  nodeCount: number,
  edgeCount: number,
): number {
  if (nodeCount < 10 && edgeCount < 20) {
    return 1.2;
  } else if (nodeCount < 20 && edgeCount < 50) {
    return 1.0;
  } else if (nodeCount < 50 && edgeCount < 100) {
    return 0.7;
  } else {
    return 0.5;
  }
}

export function applyLayoutWithAdaptiveZoom(cy: Core): void {
  if (!cy) return;

  const nodeCount = cy.nodes().length;
  const edgeCount = cy.edges().length;

  cy.fit();
  const zoomFactor = calculateAdaptiveZoom(nodeCount, edgeCount);
  cy.zoom(cy.zoom() * zoomFactor);
}

let lastSelectedNode: string | null = null;

export function applyCytoscapeStyles(cy: Core, selectedNode: string | null) {
  const hasSelectionChanged = lastSelectedNode !== selectedNode;

  if (!hasSelectionChanged && selectedNode === null) {
    return;
  }

  lastSelectedNode = selectedNode;

  if (selectedNode === null) {
    cy.nodes().style({
      opacity: 1,
      "border-width": (node: NodeSingular) => (node.data().isQueryGene ? 3 : 2),
      "border-color": (node: NodeSingular) => {
        const data = node.data();
        if (data.isQueryGene) return "#dc2626";
        if (data.degree > 2) return "#d97706";
        return "#ffffff";
      },
    });

    cy.edges().style({
      opacity: (edge: EdgeSingular) => {
        const confidence = edge.data().confidence || 0.5;
        return Math.max(0.6, Math.min(0.9, 0.6 + confidence * 0.3));
      },
    });
    return;
  }

  cy.nodes().style({
    opacity: (node: NodeSingular) => (node.id() === selectedNode ? 1 : 0.6),
    "border-width": (node: NodeSingular) => {
      if (node.id() === selectedNode) return 4;
      return node.data().isQueryGene ? 3 : 2;
    },
    "border-color": (node: NodeSingular) => {
      if (node.id() === selectedNode) return "#1d4ed8";
      const data = node.data();
      if (data.isQueryGene) return "#dc2626";
      if (data.degree > 2) return "#d97706";
      return "#ffffff";
    },
  });

  cy.edges().style({
    opacity: (edge: EdgeSingular) => {
      const confidence = edge.data().confidence || 0.5;
      const baseOpacity = Math.max(0.6, Math.min(0.9, 0.6 + confidence * 0.3));
      return baseOpacity * 0.5;
    },
  });

  const selectedNodeElement = cy.getElementById(selectedNode);
  if (selectedNodeElement.length > 0) {
    const connectedEdges = selectedNodeElement.connectedEdges();
    const connectedNodes = connectedEdges
      .connectedNodes()
      .not(selectedNodeElement);

    connectedEdges.style({
      opacity: 1,
      width: (edge: EdgeSingular) => {
        const currentWidth = parseFloat(edge.style("width"));
        return Math.max(currentWidth, 3);
      },
    });

    connectedNodes.style({
      opacity: 1,
    });
  }
}

export const cytoscapeBaseStyle: cytoscape.StylesheetStyle[] = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-family":
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "font-weight": 500,
      "text-valign": "center",
      "text-halign": "center",
      "font-size": "11px",
      "text-transform": "uppercase",
    },
  },
  {
    selector: "node.gene",
    style: {
      shape: "ellipse",
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-color": "#ef4444",
      "border-width": 3,
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      "haystack-radius": 0.5,
      "control-point-step-size": 60,
      "edge-distances": "node-position",
      "source-distance-from-node": 8,
      "target-distance-from-node": 8,
    },
  },
  {
    selector: "edge.direct",
    style: {
      "curve-style": "bezier",
      "line-style": "solid",
    },
  },
  {
    selector: "edge.physical",
    style: {
      "curve-style": "unbundled-bezier",
      "line-style": "dashed",
      "line-dash-pattern": [10, 6],
    },
  },
  {
    selector: "edge.complex",
    style: {
      "curve-style": "bezier",
      "line-style": "dotted",
      "line-dash-pattern": [3, 5],
    },
  },
];
