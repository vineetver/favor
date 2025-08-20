import cytoscape, {
  Core,
  ElementsDefinition,
  EdgeSingular,
  NodeSingular,
} from "cytoscape";
import type {
  BiogridProcessedInteraction,
  BiogridCytoscapeNodeData,
  BiogridCytoscapeEdgeData,
} from "@/components/features/gene/ppi/biogrid/biogrid-types";

// Internal cache for expensive operations
const _cache = new Map<string, any>();
const _cacheKeyGenerator = (...args: any[]) => JSON.stringify(args);

// Clear cache periodically to prevent memory leaks
let _cacheSize = 0;
const MAX_CACHE_SIZE = 50;
const _clearOldCache = () => {
  if (_cacheSize > MAX_CACHE_SIZE) {
    const keys = Array.from(_cache.keys());
    keys
      .slice(0, Math.floor(keys.length / 2))
      .forEach((key) => _cache.delete(key));
    _cacheSize = _cache.size;
  }
};

// Export function to clear cache manually (for testing or memory management)
export const clearBiogridCache = () => {
  _cache.clear();
  _cacheSize = 0;
  _lastSelectedNode = null;
  _lastStyleHash = null;
};

export const BIOGRID_LAYOUT_OPTIONS = {
  "cose-bilkent": {
    name: "cose-bilkent",
    quality: "default",
    nodeDimensionsIncludeLabels: true,
    randomize: true,
    packComponents: false,
    nodeRepulsion: 8000,
    idealEdgeLength: 100,
    edgeElasticity: 0.2,
    nestingFactor: 0.01,
    gravity: 0.1,
    numIter: 3500,
    tile: false,
    animate: "end",
    animationDuration: 1200,
    fit: true,
    padding: 40,
  },
  cola: {
    name: "cola",
    animate: true,
    animationDuration: 1200,
    randomize: true,
    maxSimulationTime: 2500,
    ungrabifyWhileSimulating: false,
    fit: true,
    padding: 40,
    nodeDimensionsIncludeLabels: true,
    edgeLength: function (edge: EdgeSingular) {
      const studyCount = edge.data("studyCount") || 1;
      return Math.max(80, 120 - studyCount * 10);
    },
    avoidOverlap: true,
    handleDisconnected: true,
    convergenceThreshold: 0.005,
    nodeSpacing: function (node: NodeSingular) {
      return 25 + (node.data("degree") || 1) * 3;
    },
    unconstrIter: 300,
    userConstIter: 100,
    allConstIter: 200,
  },
  circle: {
    name: "circle",
    fit: true,
    padding: 40,
    radius: function (nodes: NodeSingular[]) {
      return Math.max(180, nodes.length * 12);
    },
    animate: true,
    animationDuration: 1000,
  },
} as const;

export type BiogridLayoutType = keyof typeof BIOGRID_LAYOUT_OPTIONS;

export interface BiogridEdgeStyle {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted";
  opacity: number;
  curveStyle: string;
  dashPattern?: number[];
}

export function getBiogridEdgeStyle(
  methods: string[],
  interactionTypes: string[],
  studyCount: number = 1,
): BiogridEdgeStyle {
  const methodCount = methods.length;

  // Default edge style
  let color = "#6b7280"; // gray-500 for consistency
  let width = 3;
  let style: "solid" | "dashed" | "dotted" = "solid";
  let opacity = 0.8;
  let curveStyle = "straight";
  let dashPattern: number[] | undefined;

  // Style based on interaction strength and type using gray palette
  const typeString = interactionTypes.join(" ").toLowerCase();

  // High contrast gray palette for better visibility in network
  if (studyCount >= 5) {
    color = "#111827"; // Very dark gray for high evidence
  } else if (studyCount >= 3) {
    color = "#4b5563"; // Medium-dark gray for medium evidence
  } else if (studyCount >= 2) {
    color = "#9ca3af"; // Light gray for lower evidence
  } else {
    color = "#e5e7eb"; // Very light gray for minimal evidence
  }

  // Adjust style based on interaction type
  if (typeString.includes("direct")) {
    style = "solid";
    curveStyle = "straight";
  } else if (
    typeString.includes("physical") ||
    typeString.includes("association")
  ) {
    style = "dashed";
    dashPattern = [8, 8];
    curveStyle = "straight";
  } else if (typeString.includes("complex") || interactionTypes.length > 1) {
    style = "dashed";
    dashPattern = [3, 8];
    curveStyle = "straight";
  }

  return {
    color,
    width,
    style,
    opacity,
    curveStyle,
    dashPattern,
  };
}

export function createBiogridCytoscapeElements(
  interactions: BiogridProcessedInteraction[],
  interactionLimit: number,
  showAllInteractions: boolean,
  filterByMethod: string,
  filterByInteractionType: string,
  queryGene?: string,
): ElementsDefinition {
  // Internal memoization for expensive operations
  const cacheKey = _cacheKeyGenerator(
    interactions.length,
    interactionLimit,
    showAllInteractions,
    filterByMethod,
    filterByInteractionType,
    queryGene,
    // Hash of first and last interactions for data change detection
    interactions[0]?.id,
    interactions[interactions.length - 1]?.id,
  );

  if (_cache.has(cacheKey)) {
    return _cache.get(cacheKey);
  }
  const nodes: cytoscape.NodeDefinition[] = [];
  const edges: cytoscape.EdgeDefinition[] = [];

  let filteredInteractions = interactions;

  // Apply filters with fallback mechanism - handle multi-valued fields
  if (filterByMethod !== "all") {
    filteredInteractions = filteredInteractions.filter((i) => {
      if (!i.method) return false;
      const methods = i.method.split(";").map((m) => m.trim());
      return methods.includes(filterByMethod);
    });
  }

  if (filterByInteractionType !== "all") {
    filteredInteractions = filteredInteractions.filter((i) => {
      if (!i.interaction_type) return false;
      const types = i.interaction_type.split(";").map((t) => t.trim());
      return types.includes(filterByInteractionType);
    });
  }

  // Fallback mechanism
  if (
    filteredInteractions.length === 0 &&
    (filterByMethod !== "all" || filterByInteractionType !== "all")
  ) {
    console.warn(
      "Filter combination resulted in zero interactions. Applying fallback mechanism.",
    );

    if (filterByMethod !== "all") {
      filteredInteractions = interactions.filter((i) => {
        if (!i.method) return false;
        const methods = i.method.split(";").map((m) => m.trim());
        return methods.includes(filterByMethod);
      });
    }

    if (
      filteredInteractions.length === 0 &&
      filterByInteractionType !== "all"
    ) {
      filteredInteractions = interactions.filter((i) => {
        if (!i.interaction_type) return false;
        const types = i.interaction_type.split(";").map((t) => t.trim());
        return types.includes(filterByInteractionType);
      });
    }

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

  // Pre-allocate maps for better performance
  const geneConnectivity = new Map<string, number>();
  const genePartners = new Map<string, Set<string>>();
  const geneDetails = new Map<
    string,
    {
      interactions: BiogridProcessedInteraction[];
      methods: Set<string>;
      types: Set<string>;
    }
  >();

  // Build gene connectivity and details from full filtered set (not limited)
  filteredInteractions.forEach((interaction: BiogridProcessedInteraction) => {
    const geneA = interaction.gene_a;
    const geneB = interaction.gene_b;

    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    // Track unique partners instead of total interactions
    if (!genePartners.has(geneA)) genePartners.set(geneA, new Set());
    if (!genePartners.has(geneB)) genePartners.set(geneB, new Set());

    genePartners.get(geneA)!.add(geneB);
    genePartners.get(geneB)!.add(geneA);

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

    geneDetails.get(geneA)?.interactions.push(interaction);
    geneDetails.get(geneB)?.interactions.push(interaction);
    geneDetails.get(geneA)?.methods.add(interaction.method);
    geneDetails.get(geneB)?.methods.add(interaction.method);
    geneDetails.get(geneA)?.types.add(interaction.interaction_type);
    geneDetails.get(geneB)?.types.add(interaction.interaction_type);
  });

  // Calculate degree as number of unique partners
  genePartners.forEach((partners, gene) => {
    geneConnectivity.set(gene, partners.size);
  });

  const sortedGenes = Array.from(geneConnectivity.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const determinedQueryGene =
    queryGene && geneConnectivity.has(queryGene)
      ? queryGene
      : sortedGenes[0]?.[0];
  const maxDegree = sortedGenes[0]?.[1] || 1;

  // Create nodes
  Array.from(geneConnectivity.entries()).forEach(([gene, degree]) => {
    const isQueryGene = gene === determinedQueryGene;
    const details = geneDetails.get(gene);
    const baseSize = isQueryGene ? 80 : 60;
    const sizeMultiplier = Math.sqrt(degree / maxDegree);
    const size = Math.max(baseSize, baseSize + sizeMultiplier * 30);
    const width = size;
    const height = size;

    let backgroundColor = "#e0f2fe";
    let borderColor = "#f1f5f9";

    if (isQueryGene) {
      backgroundColor = "#fecaca";
      borderColor = "#f87171";
    } else if (degree >= 5) {
      backgroundColor = "#fef3c7";
      borderColor = "#fbbf24";
    }

    let nodeClass = "gene";
    if (isQueryGene) {
      nodeClass += " query-gene";
    } else if (degree >= 5) {
      nodeClass += " highly-connected";
    }

    nodes.push({
      data: {
        id: gene,
        label: gene,
        type: "gene",
        degree: degree,
        isQueryGene: isQueryGene,
        interactions: details?.interactions || [],
        methods: Array.from(details?.methods || []),
        interactionTypes: Array.from(details?.types || []),
        // Style data for stylesheet
        nodeWidth: width,
        nodeHeight: height,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
      } as BiogridCytoscapeNodeData & {
        nodeWidth: number;
        nodeHeight: number;
        backgroundColor: string;
        borderColor: string;
      },
      classes: nodeClass,
    });
  });

  // Group interactions by gene pair for cleaner edges (use limited set for edge display)
  const interactionGroups = new Map<string, BiogridProcessedInteraction[]>();

  limitedInteractions.forEach((interaction) => {
    const geneA = interaction.gene_a;
    const geneB = interaction.gene_b;

    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    const pairKey = [geneA, geneB].sort().join("|");

    if (!interactionGroups.has(pairKey)) {
      interactionGroups.set(pairKey, []);
    }
    interactionGroups.get(pairKey)!.push(interaction);
  });

  // Create clean, consolidated edges
  Array.from(interactionGroups.entries()).forEach(([pairKey, interactions]) => {
    const [geneA, geneB] = pairKey.split("|");

    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    const methods = Array.from(
      new Set(
        interactions
          .map((i) => i.method)
          .filter((m): m is string => Boolean(m)),
      ),
    );
    const types = Array.from(
      new Set(
        interactions
          .map((i) => i.interaction_type)
          .filter((t): t is string => Boolean(t)),
      ),
    );
    const publications = Array.from(
      new Set(
        interactions
          .map((i) => i.publication)
          .filter((p): p is string => Boolean(p)),
      ),
    );

    const studyCount = interactions.length;
    const edgeStyle = getBiogridEdgeStyle(methods, types, studyCount);

    const edgeClass = `biogrid-interaction ${types.join("-").replace(/\s+/g, "-")} studies-${studyCount >= 5 ? "high" : studyCount >= 3 ? "medium" : studyCount >= 2 ? "low" : "single"}`;

    edges.push({
      data: {
        id: `biogrid-${pairKey}`,
        source: geneA,
        target: geneB,
        methods: methods,
        interactionTypes: types,
        publications: publications,
        studyCount: studyCount,
        type: "interaction",
        allInteractions: interactions,
        // Style data for stylesheet
        lineColor: edgeStyle.color,
        edgeWidth: edgeStyle.width,
        edgeOpacity: edgeStyle.opacity,
        curveStyle: edgeStyle.curveStyle,
        lineStyle: edgeStyle.style,
        dashPattern: edgeStyle.dashPattern || [],
      } as BiogridCytoscapeEdgeData & {
        lineColor: string;
        edgeWidth: number;
        edgeOpacity: number;
        curveStyle: string;
        lineStyle: string;
        dashPattern?: number[];
      },
      classes: edgeClass,
    });
  });

  const result = { nodes, edges };

  // Store in cache for future use
  _cache.set(cacheKey, result);
  _cacheSize++;
  _clearOldCache();

  return result;
}

// Cache the last applied styles to avoid redundant operations
let _lastSelectedNode: string | null = null;
let _lastStyleHash: string | null = null;

export function applyBiogridStyles(cy: Core, selectedNode: string | null) {
  // Quick exit if no actual change
  const currentHash = `${selectedNode || "null"}-${cy.nodes().length}-${cy.edges().length}`;
  if (_lastSelectedNode === selectedNode && _lastStyleHash === currentHash) {
    return;
  }

  _lastSelectedNode = selectedNode;
  _lastStyleHash = currentHash;

  if (selectedNode === null) {
    // Batch style updates for better performance
    cy.batch(() => {
      cy.nodes().style({
        opacity: 1,
        "border-width": 0,
        "border-color": "transparent",
      });

      cy.edges().style({
        opacity: 0.8,
        width: 3,
        "line-color": (edge: any) => {
          const edgeData = edge.data();
          const studyCount = edgeData.studyCount || 1;
          if (studyCount >= 5) return "#111827";
          if (studyCount >= 3) return "#4b5563";
          if (studyCount >= 2) return "#9ca3af";
          return "#e5e7eb";
        },
      });
    });
    return;
  }

  // Batch all style updates for optimal performance
  cy.batch(() => {
    cy.nodes().style({
      opacity: (node: NodeSingular) => (node.id() === selectedNode ? 1 : 0.4),
      "border-width": (node: NodeSingular) => {
        if (node.id() === selectedNode) return 4;
        return 0;
      },
      "border-color": (node: NodeSingular) => {
        if (node.id() === selectedNode) {
          const data = node.data();
          if (data.isQueryGene) return "#ef4444";
          if (data.degree >= 5) return "#f59e0b";
          return "#3b82f6";
        }
        return "transparent";
      },
    });

    cy.edges().style({
      opacity: 0.15,
      width: 1,
    });

    const selectedNodeElement = cy.getElementById(selectedNode);
    if (selectedNodeElement.length > 0) {
      const connectedEdges = selectedNodeElement.connectedEdges();
      const connectedNodes = connectedEdges
        .connectedNodes()
        .not(selectedNodeElement);

      connectedEdges.style({
        opacity: 1,
        width: (edge: any) => {
          const edgeData = edge.data();
          const studyCount = edgeData.studyCount || 1;
          return studyCount >= 5 ? 8 : studyCount >= 3 ? 6 : 5;
        },
        "line-color": (edge: any) => {
          const edgeData = edge.data();
          const studyCount = edgeData.studyCount || 1;
          if (studyCount >= 5) return "#0f172a";
          if (studyCount >= 3) return "#1e293b";
          if (studyCount >= 2) return "#374151";
          return "#6b7280";
        },
        "overlay-opacity": 0,
        "overlay-color": "#ffffff",
        "overlay-padding": 2,
      });

      connectedNodes.style({
        opacity: 0.8,
        "border-width": 3,
        "border-color": (node: NodeSingular) => {
          const data = node.data();
          if (data.isQueryGene) return "#ef4444";
          if (data.degree >= 5) return "#f59e0b";
          return "#3b82f6";
        },
      });
    }
  });
}

export const biogridCytoscapeBaseStyle: cytoscape.StylesheetJson = [
  {
    selector: "node.gene",
    style: {
      label: "data(label)",
      "font-family":
        '"Inter", "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "font-weight": "bold",
      "text-valign": "center",
      "text-halign": "center",
      "font-size": "14px",
      "text-transform": "none",
      shape: "ellipse",
      color: "#1a1a1a",
      "text-outline-width": 1,
      "text-outline-color": "#ffffff",
      "text-outline-opacity": 0.7,
      width: "data(nodeWidth)",
      height: "data(nodeHeight)",
      "background-color": "data(backgroundColor)",
      "border-color": "data(borderColor)",
      "border-width": 0,
      opacity: 1,
      "transition-property": "opacity, border-width, border-color",
      "transition-duration": 0.3,
      "transition-timing-function": "ease-out",
    },
  },
  {
    selector: "node.query-gene",
    style: {
      "font-size": "16px",
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-color": "#1d1d1d", // teal-500
      "border-width": 4,
    },
  },
  {
    selector: "edge.biogrid-interaction",
    style: {
      "line-color": "data(lineColor)",
      width: "data(edgeWidth)" as any,
      opacity: "data(edgeOpacity)" as any,
      "curve-style": "data(curveStyle)" as any,
      "line-style": "data(lineStyle)" as any,
      "source-distance-from-node": 5,
      "target-distance-from-node": 5,
      "edge-distances": "node-position",
      "transition-property": "opacity, width, line-color",
      "transition-duration": 0.3,
      "transition-timing-function": "ease-out",
    },
  },
  {
    selector: "edge.biogrid-interaction[dashPattern]",
    style: {
      "line-dash-pattern": "data(dashPattern)" as any,
    },
  },
  {
    selector: "edge.studies-high",
    style: {
      "line-color": "#111827",
    },
  },
  {
    selector: "edge.studies-medium",
    style: {
      "line-color": "#4b5563",
    },
  },
  {
    selector: "edge.studies-low",
    style: {
      "line-color": "#9ca3af",
    },
  },
  {
    selector: "edge.studies-single",
    style: {
      "line-color": "#e5e7eb",
    },
  },
];
