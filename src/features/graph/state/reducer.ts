import type { ExplorerNode, ExplorerEdge, InspectorMode } from "../types/node";
import type { GraphFilters } from "../types/filters";
import type { EdgeType } from "../types/edge";
import { DEFAULT_SELECTION } from "../types/node";
import { DEFAULT_FILTERS } from "../types/filters";
import type {
  ExplorerState,
  GraphData,
  ViewMode,
  ExplorerLayoutType,
  LensId,
} from "../types/state";

// =============================================================================
// ACTION TYPES
// =============================================================================

export type ExplorerAction =
  | { type: "HYDRATE_INITIAL"; graph: GraphData; lensId: LensId }
  | { type: "SWITCH_LENS_START"; lensId: LensId }
  | { type: "SWITCH_LENS_SUCCESS"; graph: GraphData; lensEdgeTypes: Set<EdgeType> }
  | { type: "SWITCH_LENS_ERROR"; error: string }
  | { type: "EXPAND_START" }
  | { type: "EXPAND_SUCCESS"; nodes: Map<string, ExplorerNode>; edges: Map<string, ExplorerEdge> }
  | { type: "EXPAND_ERROR"; error: string }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "SELECT_NODE"; nodeId: string; node: ExplorerNode }
  | { type: "SELECT_EDGE"; edgeId: string; edge: ExplorerEdge }
  | { type: "TOGGLE_MULTI_SELECT"; nodeId: string; node: ExplorerNode }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_FILTERS"; filters: GraphFilters }
  | { type: "TOGGLE_EDGE_TYPE"; edgeType: EdgeType }
  | { type: "SET_ALL_EDGE_TYPES"; edgeTypes: Set<EdgeType> }
  | { type: "CLEAR_ALL_EDGE_TYPES" }
  | { type: "SET_LAYOUT"; layout: ExplorerLayoutType }
  | { type: "SET_VIEW_MODE"; viewMode: ViewMode }
  | { type: "TOGGLE_LEFT_DRAWER" }
  | { type: "SET_INSPECTOR_MODE"; mode: InspectorMode };

// =============================================================================
// REDUCER
// =============================================================================

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "HYDRATE_INITIAL": {
      return {
        status: "ready",
        graph: action.graph,
        selection: DEFAULT_SELECTION,
        filters: { ...DEFAULT_FILTERS, edgeTypes: new Set(DEFAULT_FILTERS.edgeTypes) },
        layout: "cose-bilkent",
        viewMode: "graph",
        activeLens: action.lensId,
        leftDrawerOpen: true,
        inspectorMode: "closed",
        expansion: { status: "idle" },
      };
    }

    case "SWITCH_LENS_START": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        activeLens: action.lensId,
        selection: DEFAULT_SELECTION,
        inspectorMode: "closed",
        expansion: { status: "loading" },
      };
    }

    case "SWITCH_LENS_SUCCESS": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        graph: action.graph,
        filters: {
          ...state.filters,
          edgeTypes: new Set([...state.filters.edgeTypes, ...action.lensEdgeTypes]),
        },
        expansion: { status: "idle" },
      };
    }

    case "SWITCH_LENS_ERROR": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        expansion: { status: "idle" },
      };
    }

    case "EXPAND_START": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        expansion: { status: "loading" },
      };
    }

    case "EXPAND_SUCCESS": {
      if (state.status !== "ready") return state;
      const mergedNodes = new Map(state.graph.nodes);
      action.nodes.forEach((node, id) => {
        if (!mergedNodes.has(id)) mergedNodes.set(id, node);
      });

      const mergedEdges = new Map(state.graph.edges);
      action.edges.forEach((edge, id) => {
        if (!mergedEdges.has(id)) mergedEdges.set(id, edge);
      });

      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: mergedNodes,
          edges: mergedEdges,
        },
        expansion: { status: "idle" },
      };
    }

    case "EXPAND_ERROR": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        expansion: { status: "idle" },
      };
    }

    case "REMOVE_NODE": {
      if (state.status !== "ready") return state;
      if (state.graph.seeds.has(action.nodeId)) return state;

      const newNodes = new Map(state.graph.nodes);
      newNodes.delete(action.nodeId);

      const newEdges = new Map(state.graph.edges);
      newEdges.forEach((edge, edgeId) => {
        if (edge.sourceId === action.nodeId || edge.targetId === action.nodeId) {
          newEdges.delete(edgeId);
        }
      });

      let selection = state.selection;
      if (selection.type === "node" && selection.nodeId === action.nodeId) {
        selection = DEFAULT_SELECTION;
      } else if (selection.type === "multi") {
        const newIds = new Set(selection.nodeIds);
        newIds.delete(action.nodeId);
        selection = newIds.size === 0 ? DEFAULT_SELECTION : { type: "multi", nodeIds: newIds };
      }

      return {
        ...state,
        graph: { ...state.graph, nodes: newNodes, edges: newEdges },
        selection,
      };
    }

    case "SELECT_NODE": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        selection: { type: "node", nodeId: action.nodeId, node: action.node },
        // Auto-peek when selecting if inspector is closed
        inspectorMode: state.inspectorMode === "closed" ? "peek" : state.inspectorMode,
      };
    }

    case "SELECT_EDGE": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        selection: { type: "edge", edgeId: action.edgeId, edge: action.edge },
        inspectorMode: state.inspectorMode === "closed" ? "peek" : state.inspectorMode,
      };
    }

    case "TOGGLE_MULTI_SELECT": {
      if (state.status !== "ready") return state;
      const prev = state.selection;

      if (prev.type === "multi") {
        const newIds = new Set(prev.nodeIds);
        if (newIds.has(action.nodeId)) {
          newIds.delete(action.nodeId);
        } else {
          newIds.add(action.nodeId);
        }
        if (newIds.size === 0) {
          return { ...state, selection: DEFAULT_SELECTION };
        }
        return { ...state, selection: { type: "multi", nodeIds: newIds } };
      }

      if (prev.type === "node" && prev.nodeId !== action.nodeId) {
        return {
          ...state,
          selection: { type: "multi", nodeIds: new Set([prev.nodeId, action.nodeId]) },
        };
      }

      return {
        ...state,
        selection: { type: "node", nodeId: action.nodeId, node: action.node },
      };
    }

    case "CLEAR_SELECTION": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        selection: DEFAULT_SELECTION,
        // Auto-close when in peek mode
        inspectorMode: state.inspectorMode === "peek" ? "closed" : state.inspectorMode,
      };
    }

    case "SET_FILTERS": {
      if (state.status !== "ready") return state;
      return { ...state, filters: action.filters };
    }

    case "TOGGLE_EDGE_TYPE": {
      if (state.status !== "ready") return state;
      const newEdgeTypes = new Set(state.filters.edgeTypes);
      if (newEdgeTypes.has(action.edgeType)) {
        newEdgeTypes.delete(action.edgeType);
      } else {
        newEdgeTypes.add(action.edgeType);
      }
      return { ...state, filters: { ...state.filters, edgeTypes: newEdgeTypes } };
    }

    case "SET_ALL_EDGE_TYPES": {
      if (state.status !== "ready") return state;
      return { ...state, filters: { ...state.filters, edgeTypes: action.edgeTypes } };
    }

    case "CLEAR_ALL_EDGE_TYPES": {
      if (state.status !== "ready") return state;
      return { ...state, filters: { ...state.filters, edgeTypes: new Set<EdgeType>() } };
    }

    case "SET_LAYOUT": {
      if (state.status !== "ready") return state;
      return { ...state, layout: action.layout };
    }

    case "SET_VIEW_MODE": {
      if (state.status !== "ready") return state;
      return { ...state, viewMode: action.viewMode };
    }

    case "TOGGLE_LEFT_DRAWER": {
      if (state.status !== "ready") return state;
      return { ...state, leftDrawerOpen: !state.leftDrawerOpen };
    }

    case "SET_INSPECTOR_MODE": {
      if (state.status !== "ready") return state;
      return { ...state, inspectorMode: action.mode };
    }

    default:
      return state;
  }
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialExplorerState: ExplorerState = { status: "idle" };
