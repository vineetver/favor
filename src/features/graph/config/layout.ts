import type { LayoutOptions } from "cytoscape";

// =============================================================================
// Layout Config
// =============================================================================

export type ExplorerLayoutType = "cose-bilkent" | "dagre" | "circle" | "concentric" | "grid";

export const EXPLORER_LAYOUT_OPTIONS: Array<{ value: ExplorerLayoutType; label: string }> = [
  { value: "cose-bilkent", label: "Force-Directed" },
  { value: "dagre", label: "Hierarchical" },
  { value: "concentric", label: "Concentric" },
  { value: "circle", label: "Circle" },
  { value: "grid", label: "Grid" },
];

export function getExplorerLayoutOptions(type: ExplorerLayoutType): LayoutOptions {
  switch (type) {
    case "cose-bilkent":
      return {
        name: "cose-bilkent",
        animate: "end",
        animationDuration: 500,
        quality: "default",
        nodeDimensionsIncludeLabels: true,
        refresh: 30,
        fit: true,
        padding: 40,
        randomize: true,
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8,
        initialEnergyOnIncremental: 0.5,
      } as LayoutOptions;

    case "dagre":
      return {
        name: "dagre",
        animate: true,
        animationDuration: 500,
        rankDir: "TB",
        nodeSep: 50,
        rankSep: 80,
        edgeSep: 10,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    case "concentric":
      return {
        name: "concentric",
        animate: true,
        animationDuration: 500,
        concentric: (node: { data: (key: string) => unknown }) =>
          node.data("isSeed") ? 100 : 100 - (node.data("depth") as number || 1) * 20,
        levelWidth: () => 1,
        minNodeSpacing: 50,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    case "circle":
      return {
        name: "circle",
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.5,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    case "grid":
      return {
        name: "grid",
        animate: true,
        animationDuration: 500,
        rows: undefined,
        cols: undefined,
        spacingFactor: 1.2,
        fit: true,
        padding: 40,
      } as LayoutOptions;

    default:
      return { name: "cose-bilkent" } as LayoutOptions;
  }
}
