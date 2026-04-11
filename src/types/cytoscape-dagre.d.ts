declare module "cytoscape-dagre" {
  import type cytoscape from "cytoscape";

  interface DagreLayoutOptions extends cytoscape.LayoutOptions {
    name: "dagre";
    /** Direction for rank nodes. Can be TB, BT, LR, or RL, where T = top, B = bottom, L = left, and R = right */
    rankDir?: "TB" | "BT" | "LR" | "RL";
    /** Separation between adjacent nodes in the same rank */
    nodeSep?: number;
    /** Separation between adjacent edges in the same rank */
    edgeSep?: number;
    /** Separation between each rank in the layout */
    rankSep?: number;
    /** Type of algorithm to assigns a rank to each node in the input graph */
    ranker?: "network-simplex" | "tight-tree" | "longest-path";
    /** Alignment for rank nodes. Can be UL, UR, DL, or DR, where U = up, D = down, L = left, and R = right */
    align?: "UL" | "UR" | "DL" | "DR";
    /** Number of rounds of rank adjustment to perform */
    minLen?: (edge: cytoscape.EdgeSingular) => number;
    /** Weight to assign edges. Higher weight edges are generally made shorter and straighter than lower weight edges */
    edgeWeight?: (edge: cytoscape.EdgeSingular) => number;
    /** Whether to animate the layout */
    animate?: boolean;
    /** Duration of animation in ms if enabled */
    animationDuration?: number;
    /** Easing of animation if enabled */
    animationEasing?: string;
    /** Whether to fit the viewport to the graph */
    fit?: boolean;
    /** Padding on fit */
    padding?: number;
    /** Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h } */
    boundingBox?: cytoscape.BoundingBox12 | cytoscape.BoundingBoxWH;
    /** A function that applies a transform to the final node position */
    transform?: (
      node: cytoscape.NodeSingular,
      position: cytoscape.Position,
    ) => cytoscape.Position;
    /** Whether to transition the node positions */
    ready?: () => void;
    /** Callback on layoutstop */
    stop?: () => void;
    /** Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up */
    spacingFactor?: number;
    /** Whether the layout should go unconstrained, ignoring the fit option */
    infinite?: boolean;
  }

  const ext: cytoscape.Ext;
  export = ext;
}
