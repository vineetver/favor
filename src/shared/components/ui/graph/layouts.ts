import type { LayoutOptions } from "cytoscape";

/**
 * Supported graph layout types
 */
export type LayoutType = "cose-bilkent" | "concentric" | "circle" | "grid";

/**
 * Layout configuration with display label
 */
export interface LayoutConfig {
  value: LayoutType;
  label: string;
  description?: string;
}

/**
 * Available layout options for graph visualization
 */
export const LAYOUT_OPTIONS: LayoutConfig[] = [
  {
    value: "cose-bilkent",
    label: "Force-directed",
    description: "Best for exploring clusters and relationships",
  },
  {
    value: "concentric",
    label: "Concentric",
    description: "Seed gene at center, neighbors in rings",
  },
  {
    value: "circle",
    label: "Circle",
    description: "All nodes arranged in a circle",
  },
  {
    value: "grid",
    label: "Grid",
    description: "Nodes arranged in a regular grid",
  },
];

/**
 * Get Cytoscape layout options for a given layout type
 */
export function getLayoutOptions(type: LayoutType): LayoutOptions {
  switch (type) {
    case "cose-bilkent":
      // CoSE-Bilkent: Compound Spring Embedder layout
      // Best force-directed layout for both compound and non-compound graphs
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

    case "concentric":
      return {
        name: "concentric",
        animate: true,
        animationDuration: 500,
        concentric: (node: { data: (key: string) => boolean }) =>
          node.data("isSeed") ? 2 : 1,
        levelWidth: () => 1,
        minNodeSpacing: 50,
      } as LayoutOptions;

    case "circle":
      return {
        name: "circle",
        animate: true,
        animationDuration: 500,
        spacingFactor: 1.5,
      } as LayoutOptions;

    case "grid":
      return {
        name: "grid",
        animate: true,
        animationDuration: 500,
        rows: undefined,
        cols: undefined,
        spacingFactor: 1.2,
      } as LayoutOptions;

    default:
      return { name: "cose-bilkent" } as LayoutOptions;
  }
}

/**
 * Limit options for the number of items to display
 */
export const LIMIT_OPTIONS = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];
