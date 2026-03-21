import type { ExplorerNode, ExplorerEdge, InspectorMode } from "../types/node";
import type { GraphFilters } from "../types/filters";
import type { EdgeType } from "../types/edge";
import type { ProvenanceEvent } from "../types/provenance";
import type { TemplateResultData } from "../types/template-results";
import { DEFAULT_SELECTION } from "../types/node";
import { DEFAULT_FILTERS } from "../types/filters";
import type {
  ExplorerState,
  GraphData,
  ViewMode,
  ExplorerLayoutType,
  TemplateId,
  AsyncOperation,
} from "../types/state";

// =============================================================================
// ACTION TYPES
// =============================================================================

export type ExplorerAction =
  | { type: "HYDRATE_INITIAL"; graph: GraphData; templateId: TemplateId; provenance: ProvenanceEvent }
  | { type: "SWITCH_TEMPLATE_START"; templateId: TemplateId }
  | { type: "SWITCH_TEMPLATE_SUCCESS"; graph: GraphData; templateEdgeTypes: Set<EdgeType>; provenance: ProvenanceEvent }
  | { type: "SWITCH_TEMPLATE_ERROR"; error: string }
  | { type: "SET_TEMPLATE_RESULTS"; results: TemplateResultData | null }
  | { type: "EXPAND_START"; nodeId: string; label: string }
  | { type: "EXPAND_SUCCESS"; nodes: Map<string, ExplorerNode>; edges: Map<string, ExplorerEdge>; provenance: ProvenanceEvent }
  | { type: "EXPAND_ERROR"; error: string }
  | { type: "DISMISS_EXPANSION_ERROR" }
  | { type: "VARIANT_TRAIL_START"; nodeId: string }
  | { type: "VARIANT_TRAIL_SUCCESS"; nodes: Map<string, ExplorerNode>; edges: Map<string, ExplorerEdge>; provenance: ProvenanceEvent }
  | { type: "VARIANT_TRAIL_ERROR"; error: string }
  | { type: "DISMISS_ERROR" }
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
// HELPERS
// =============================================================================

function stampProvenance(
  existing: Map<string, ProvenanceEvent[]>,
  ids: Iterable<string>,
  event: ProvenanceEvent,
): Map<string, ProvenanceEvent[]> {
  const result = new Map(existing);
  for (const id of ids) {
    const prev = result.get(id);
    result.set(id, prev ? [...prev, event] : [event]);
  }
  return result;
}


// =============================================================================
// REDUCER
// =============================================================================

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "HYDRATE_INITIAL": {
      // Stamp all initial nodes and edges with the provenance event
      const provenance = stampProvenance(
        new Map(),
        [...action.graph.nodes.keys(), ...action.graph.edges.keys()],
        action.provenance,
      );
      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        status: "ready",
        graph: { ...action.graph, provenance },
        selection: DEFAULT_SELECTION,
        filters: { ...DEFAULT_FILTERS, edgeTypes: new Set(DEFAULT_FILTERS.edgeTypes) },
        layout: "cose-bilkent",
        viewMode: "graph",
        activeTemplate: action.templateId,
        templateResults: null,
        leftDrawerOpen: true,
        inspectorMode: "closed",
        async: asyncOp,

      };
    }

    case "SWITCH_TEMPLATE_START": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "switching_template", targetTemplateId: action.templateId };
      return {
        ...state,
        activeTemplate: action.templateId,
        templateResults: null,
        selection: DEFAULT_SELECTION,
        inspectorMode: "closed",
        async: asyncOp,

      };
    }

    case "SWITCH_TEMPLATE_SUCCESS": {
      if (state.status !== "ready") return state;
      const provenance = stampProvenance(
        new Map(),
        [...action.graph.nodes.keys(), ...action.graph.edges.keys()],
        action.provenance,
      );
      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        ...state,
        graph: { ...action.graph, provenance },
        filters: {
          ...state.filters,
          edgeTypes: new Set([...state.filters.edgeTypes, ...action.templateEdgeTypes]),
        },
        async: asyncOp,

      };
    }

    case "SWITCH_TEMPLATE_ERROR": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "error", operation: "switching_template", message: action.error };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "SET_TEMPLATE_RESULTS": {
      if (state.status !== "ready") return state;
      return {
        ...state,
        templateResults: action.results,
      };
    }

    case "EXPAND_START": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "expanding", nodeId: action.nodeId, label: action.label };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "EXPAND_SUCCESS": {
      if (state.status !== "ready") return state;
      const mergedNodes = new Map(state.graph.nodes);
      const newNodeIds: string[] = [];
      action.nodes.forEach((node, id) => {
        if (!mergedNodes.has(id)) {
          mergedNodes.set(id, node);
          newNodeIds.push(id);
        }
      });

      const mergedEdges = new Map(state.graph.edges);
      const newEdgeIds: string[] = [];
      action.edges.forEach((edge, id) => {
        if (!mergedEdges.has(id)) {
          mergedEdges.set(id, edge);
          newEdgeIds.push(id);
        }
      });

      // Only stamp provenance on newly added items
      const provenance = stampProvenance(
        state.graph.provenance,
        [...newNodeIds, ...newEdgeIds],
        action.provenance,
      );

      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: mergedNodes,
          edges: mergedEdges,
          provenance,
        },
        async: asyncOp,

      };
    }

    case "EXPAND_ERROR": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "error", operation: "expanding", message: action.error };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "DISMISS_EXPANSION_ERROR": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "VARIANT_TRAIL_START": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "running_variant_trail", nodeId: action.nodeId };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "VARIANT_TRAIL_SUCCESS": {
      if (state.status !== "ready") return state;
      const mergedNodes = new Map(state.graph.nodes);
      const newNodeIds: string[] = [];
      action.nodes.forEach((node, id) => {
        if (!mergedNodes.has(id)) {
          mergedNodes.set(id, node);
          newNodeIds.push(id);
        }
      });

      const mergedEdges = new Map(state.graph.edges);
      const newEdgeIds: string[] = [];
      action.edges.forEach((edge, id) => {
        if (!mergedEdges.has(id)) {
          mergedEdges.set(id, edge);
          newEdgeIds.push(id);
        }
      });

      const provenance = stampProvenance(
        state.graph.provenance,
        [...newNodeIds, ...newEdgeIds],
        action.provenance,
      );

      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        ...state,
        graph: {
          ...state.graph,
          nodes: mergedNodes,
          edges: mergedEdges,
          provenance,
        },
        async: asyncOp,

      };
    }

    case "VARIANT_TRAIL_ERROR": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "error", operation: "running_variant_trail", message: action.error };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "DISMISS_ERROR": {
      if (state.status !== "ready") return state;
      const asyncOp: AsyncOperation = { type: "idle" };
      return {
        ...state,
        async: asyncOp,

      };
    }

    case "REMOVE_NODE": {
      if (state.status !== "ready") return state;
      if (state.graph.seeds.has(action.nodeId)) return state;

      const newNodes = new Map(state.graph.nodes);
      newNodes.delete(action.nodeId);

      const removedEdgeIds: string[] = [];
      const newEdges = new Map(state.graph.edges);
      newEdges.forEach((edge, edgeId) => {
        if (edge.sourceId === action.nodeId || edge.targetId === action.nodeId) {
          newEdges.delete(edgeId);
          removedEdgeIds.push(edgeId);
        }
      });

      // Clean up provenance for removed node + edges
      const newProvenance = new Map(state.graph.provenance);
      newProvenance.delete(action.nodeId);
      for (const edgeId of removedEdgeIds) {
        newProvenance.delete(edgeId);
      }

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
        graph: { ...state.graph, nodes: newNodes, edges: newEdges, provenance: newProvenance },
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
