// Backward-compat: re-export everything from the new graph feature modules
export * from "@features/graph/types";
export {
  GRAPH_LENSES,
  DEFAULT_LENS,
  type GraphLens,
  type QueryStep,
} from "@features/graph/config/lenses";
export {
  EXPLORER_LAYOUT_OPTIONS,
  getExplorerLayoutOptions,
} from "@features/graph/config/layout";
export {
  NODE_EXPANSION_CONFIG,
  type ExpansionConfig,
} from "@features/graph/config/expansion";
export {
  NODE_TYPE_COLORS,
  SEED_NODE_COLORS,
  getNodeColors,
  getNodeSize,
  getEdgeColor,
  getEdgeWidth,
} from "@features/graph/config/styling";
export {
  nodeToElementData,
  edgeToElementData,
  transformToElements,
  getGraphSummary,
} from "@features/graph/utils/elements";
export {
  createEdgeId,
  parseEdgeId,
} from "@features/graph/utils/keys";
