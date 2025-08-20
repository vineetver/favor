import cytoscape, {
  Core,
  ElementsDefinition,
  EdgeSingular,
  NodeSingular,
} from "cytoscape";
import type {
  IntactProcessedInteraction,
  IntactCytoscapeNodeData,
  IntactCytoscapeEdgeData,
} from "@/components/features/gene/ppi/intact/intact-types";

export const INTACT_LAYOUT_OPTIONS = {
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

export type IntactLayoutType = keyof typeof INTACT_LAYOUT_OPTIONS;

export interface IntactEdgeStyle {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted";
  opacity: number;
  curveStyle: string;
  dashPattern?: number[];
}

export function getIntactEdgeStyle(
  methods: string[],
  interactionTypes: string[],
  expansionMethods: string[],
  biologicalRoles: string[],
  studyCount: number = 1,
  hasNegative: boolean = false,
): IntactEdgeStyle {
  let color = "#374151";
  let width = 2;
  let style: "solid" | "dashed" | "dotted" = "solid";
  let opacity = 0.8;
  let curveStyle = "straight";
  let dashPattern: number[] | undefined;

  if (hasNegative) {
    color = "#dc2626";
    opacity = 0.9;
  }

  const typeString = interactionTypes.join(" ").toLowerCase();
  const expansionString = expansionMethods.join(" ").toLowerCase();

  if (typeString.includes("direct")) {
    color = hasNegative ? "#dc2626" : "#1e40af";
    style = "solid";
    curveStyle = "straight";
  } else if (
    typeString.includes("physical") ||
    typeString.includes("association")
  ) {
    color = hasNegative ? "#dc2626" : "#166534";
    style = "dashed";
    dashPattern = [8, 8];
    curveStyle = "straight";
  } else if (typeString.includes("complex")) {
    color = hasNegative ? "#dc2626" : "#7c2d12";
    style = "dashed";
    dashPattern = [3, 8];
    curveStyle = "straight";
  } else if (expansionString.includes("spoke")) {
    color = hasNegative ? "#dc2626" : "#9333ea";
    style = "dotted";
    dashPattern = [2, 6];
    curveStyle = "straight";
  } else if (expansionString.includes("matrix")) {
    color = hasNegative ? "#dc2626" : "#059669";
    style = "dashed";
    dashPattern = [6, 4];
    curveStyle = "straight";
  } else if (interactionTypes.length > 1) {
    color = hasNegative ? "#dc2626" : "#6b21a8";
    style = "dashed";
    dashPattern = [3, 8];
    curveStyle = "straight";
  }

  width = Math.min(6, Math.max(2, 2 + Math.log2(studyCount)));

  return {
    color,
    width,
    style,
    opacity,
    curveStyle,
    dashPattern,
  };
}

export function createIntactCytoscapeElements(
  interactions: IntactProcessedInteraction[],
  interactionLimit: number,
  showAllInteractions: boolean,
  filterByMethod: string,
  filterByInteractionType: string,
  filterByExpansionMethod: string = "all",
  filterByBiologicalRole: string = "all",
  showNegativeInteractions: boolean = true,
  queryGene?: string,
): ElementsDefinition {
  const nodes: cytoscape.NodeDefinition[] = [];
  const edges: cytoscape.EdgeDefinition[] = [];

  let filteredInteractions = interactions;

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

  if (filterByExpansionMethod !== "all") {
    filteredInteractions = filteredInteractions.filter((i) => {
      if (!i.expansion_method) return false;
      return i.expansion_method.includes(filterByExpansionMethod);
    });
  }

  if (filterByBiologicalRole !== "all") {
    filteredInteractions = filteredInteractions.filter((i) => {
      return (
        i.biological_role_a.includes(filterByBiologicalRole) ||
        i.biological_role_b.includes(filterByBiologicalRole)
      );
    });
  }

  if (!showNegativeInteractions) {
    filteredInteractions = filteredInteractions.filter((i) => !i.negative);
  }

  if (filteredInteractions.length === 0 && interactions.length > 0) {
    console.warn(
      "IntAct filters resulted in zero interactions. Using all interactions.",
    );
    filteredInteractions = interactions;
  }

  const limitedInteractions = showAllInteractions
    ? filteredInteractions
    : filteredInteractions.slice(0, interactionLimit);

  const geneConnectivity = new Map<string, number>();
  const genePartners = new Map<string, Set<string>>();
  const geneDetails = new Map<string, any>();

  filteredInteractions.forEach((interaction: IntactProcessedInteraction) => {
    const geneA = interaction.gene_a;
    const geneB = interaction.gene_b;

    if (!geneA || !geneB || geneA.trim() === "" || geneB.trim() === "") {
      return;
    }

    if (!genePartners.has(geneA)) genePartners.set(geneA, new Set());
    if (!genePartners.has(geneB)) genePartners.set(geneB, new Set());

    genePartners.get(geneA)!.add(geneB);
    genePartners.get(geneB)!.add(geneA);

    if (!geneDetails.has(geneA))
      geneDetails.set(geneA, {
        interactions: [],
        methods: new Set(),
        types: new Set(),
        expansionMethods: new Set(),
        biologicalRoles: new Set(),
        experimentalRoles: new Set(),
        hostOrganisms: new Set(),
        hasNegative: false,
        interactorTypes: new Set(),
      });
    if (!geneDetails.has(geneB))
      geneDetails.set(geneB, {
        interactions: [],
        methods: new Set(),
        types: new Set(),
        expansionMethods: new Set(),
        biologicalRoles: new Set(),
        experimentalRoles: new Set(),
        hostOrganisms: new Set(),
        hasNegative: false,
        interactorTypes: new Set(),
      });

    const detailsA = geneDetails.get(geneA);
    const detailsB = geneDetails.get(geneB);

    detailsA.interactions.push(interaction);
    detailsB.interactions.push(interaction);
    detailsA.methods.add(interaction.method);
    detailsB.methods.add(interaction.method);
    detailsA.types.add(interaction.interaction_type);
    detailsB.types.add(interaction.interaction_type);
    detailsA.expansionMethods.add(interaction.expansion_method);
    detailsB.expansionMethods.add(interaction.expansion_method);
    detailsA.biologicalRoles.add(interaction.biological_role_a);
    detailsB.biologicalRoles.add(interaction.biological_role_b);
    detailsA.experimentalRoles.add(interaction.experimental_role_a);
    detailsB.experimentalRoles.add(interaction.experimental_role_b);
    detailsA.hostOrganisms.add(interaction.host_organism);
    detailsB.hostOrganisms.add(interaction.host_organism);
    detailsA.interactorTypes.add(interaction.type_interactor_a);
    detailsB.interactorTypes.add(interaction.type_interactor_b);

    if (interaction.negative) {
      detailsA.hasNegative = true;
      detailsB.hasNegative = true;
    }
  });

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
    } else if (details?.hasNegative) {
      backgroundColor = "#fee2e2";
      borderColor = "#fca5a5";
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
        expansionMethods: Array.from(details?.expansionMethods || []),
        biologicalRoles: Array.from(details?.biologicalRoles || []),
        experimentalRoles: Array.from(details?.experimentalRoles || []),
        hostOrganisms: Array.from(details?.hostOrganisms || []),
        hasNegativeInteractions: details?.hasNegative || false,
        interactorTypes: Array.from(details?.interactorTypes || []),
      } as IntactCytoscapeNodeData,
      classes: isQueryGene ? "gene query-gene" : "gene",
      style: {
        width: width,
        height: height,
        "background-color": backgroundColor,
        "border-color": borderColor,
        color: "#1a1a1a",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": isQueryGene ? "16px" : "14px",
        "font-weight": "600",
        "font-family":
          '"Inter", "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        "text-transform": "none",
        "text-outline-width": 1,
        "text-outline-color": "#ffffff",
        "text-outline-opacity": 0.7,
        "border-width": 0,
        opacity: 1,
      },
    });
  });

  const interactionGroups = new Map<string, IntactProcessedInteraction[]>();

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
    const expansionMethods = Array.from(
      new Set(
        interactions
          .map((i) => i.expansion_method)
          .filter((e): e is string => Boolean(e)),
      ),
    );
    const biologicalRoles = Array.from(
      new Set(
        [
          ...interactions.map((i) => i.biological_role_a),
          ...interactions.map((i) => i.biological_role_b),
        ].filter((r): r is string => Boolean(r)),
      ),
    );
    const experimentalRoles = Array.from(
      new Set(
        [
          ...interactions.map((i) => i.experimental_role_a),
          ...interactions.map((i) => i.experimental_role_b),
        ].filter((r): r is string => Boolean(r)),
      ),
    );
    const hostOrganisms = Array.from(
      new Set(
        interactions
          .map((i) => i.host_organism)
          .filter((h): h is string => Boolean(h)),
      ),
    );
    const publications = Array.from(
      new Set(
        interactions
          .map((i) => i.publication)
          .filter((p): p is string => Boolean(p)),
      ),
    );
    const hasNegative = interactions.some((i) => i.negative);

    const studyCount = interactions.length;
    const edgeStyle = getIntactEdgeStyle(
      methods,
      types,
      expansionMethods,
      biologicalRoles,
      studyCount,
      hasNegative,
    );

    edges.push({
      data: {
        id: `intact-${pairKey}`,
        source: geneA,
        target: geneB,
        methods: methods,
        interactionTypes: types,
        publications: publications,
        studyCount: studyCount,
        type: "interaction",
        allInteractions: interactions,
        expansionMethods: expansionMethods,
        biologicalRoles: biologicalRoles,
        experimentalRoles: experimentalRoles,
        hostOrganisms: hostOrganisms,
        hasNegativeInteractions: hasNegative,
        detectionMethodCount: Math.max(
          ...interactions.map((i) => i.detection_method_count),
        ),
      } as IntactCytoscapeEdgeData,
      classes: `intact-interaction ${types.join("-").replace(/\s+/g, "-")}`,
      style: {
        "line-color": edgeStyle.color,
        width: edgeStyle.width,
        opacity: edgeStyle.opacity,
        "curve-style": edgeStyle.curveStyle,
        "line-style": edgeStyle.style,
        "line-dash-pattern": edgeStyle.dashPattern,
        "source-distance-from-node": 5,
        "target-distance-from-node": 5,
        "edge-distances": "node-position",
      },
    });
  });

  return { nodes, edges };
}

export function applyIntactStyles(cy: Core, selectedNode: string | null) {
  if (selectedNode === null) {
    cy.nodes().style({
      opacity: 1,
      "border-width": 0,
      "border-color": "transparent",
    });

    cy.edges().style({
      opacity: 0.8,
    });
    return;
  }

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
        if (data.hasNegativeInteractions) return "#dc2626";
        return "#3b82f6";
      }
      return "transparent";
    },
  });

  cy.edges().style({
    opacity: 0.2,
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
        return Math.max(currentWidth * 1.5, 3);
      },
    });

    connectedNodes.style({
      opacity: 0.8,
      "border-width": 3,
      "border-color": (node: NodeSingular) => {
        const data = node.data();
        if (data.isQueryGene) return "#ef4444";
        if (data.degree >= 5) return "#f59e0b";
        if (data.hasNegativeInteractions) return "#dc2626";
        return "#3b82f6";
      },
    });
  }
}

export const intactCytoscapeBaseStyle: cytoscape.StylesheetJson = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-family":
        '"Inter", "SF Pro Display", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "font-weight": "bold",
      "text-valign": "center",
      "text-halign": "center",
      "font-size": "15px",
      "text-transform": "none",
      shape: "ellipse",
      color: "#1a1a1a",
      "text-outline-width": 1,
      "text-outline-color": "#ffffff",
      "text-outline-opacity": 0.7,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-color": "#1d4ed8",
      "border-width": 4,
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "straight",
      "source-distance-from-node": 5,
      "target-distance-from-node": 5,
      "edge-distances": "node-position",
    },
  },
  {
    selector: "edge.intact-interaction",
    style: {
      "curve-style": "straight",
    },
  },
];
