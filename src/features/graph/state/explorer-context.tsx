"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type { ExplorerNode, ExplorerEdge } from "../types/node";
import type { GraphFilters } from "../types/filters";
import type { EdgeType } from "../types/edge";
import type {
  ExplorerState,
  GraphData,
  ViewMode,
  ExplorerLayoutType,
  LensId,
} from "../types/state";
import type { ExpansionConfig } from "../config/expansion";
import { explorerReducer, initialExplorerState, type ExplorerAction } from "./reducer";
import {
  selectElements,
  selectGraphSummary,
  selectHighlightedNodeIds,
  selectHighlightedEdgeId,
  selectIsExpanding,
} from "./selectors";

// =============================================================================
// CONTEXT TYPE
// =============================================================================

type ExplorerContextValue = {
  state: ExplorerState;
  dispatch: Dispatch<ExplorerAction>;
  actions: {
    hydrateInitial: (graph: GraphData, lensId: LensId) => void;
    switchLensStart: (lensId: LensId) => void;
    switchLensSuccess: (graph: GraphData, lensEdgeTypes: Set<EdgeType>) => void;
    switchLensError: (error: string) => void;
    expandStart: () => void;
    expandSuccess: (nodes: Map<string, ExplorerNode>, edges: Map<string, ExplorerEdge>) => void;
    expandError: (error: string) => void;
    removeNode: (nodeId: string) => void;
    selectNode: (nodeId: string, node: ExplorerNode) => void;
    selectEdge: (edgeId: string, edge: ExplorerEdge) => void;
    toggleMultiSelect: (nodeId: string, node: ExplorerNode) => void;
    clearSelection: () => void;
    setFilters: (filters: GraphFilters) => void;
    toggleEdgeType: (edgeType: EdgeType) => void;
    setAllEdgeTypes: (edgeTypes: Set<EdgeType>) => void;
    clearAllEdgeTypes: () => void;
    setLayout: (layout: ExplorerLayoutType) => void;
    setViewMode: (viewMode: ViewMode) => void;
    toggleLeftDrawer: () => void;
    toggleRightPanel: () => void;
    setRightPanel: (open: boolean) => void;
  };
  selectors: {
    elements: () => ReturnType<typeof selectElements>;
    graphSummary: () => ReturnType<typeof selectGraphSummary>;
    highlightedNodeIds: () => Set<string> | undefined;
    highlightedEdgeId: () => string | undefined;
    isExpanding: () => boolean;
    getNode: (id: string) => ExplorerNode | undefined;
    getEdge: (id: string) => ExplorerEdge | undefined;
  };
};

const ExplorerContext = createContext<ExplorerContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

type ExplorerProviderProps = {
  children: ReactNode;
};

export function ExplorerProvider({ children }: ExplorerProviderProps) {
  const [state, dispatch] = useReducer(explorerReducer, initialExplorerState);

  // Action creators - stable references
  const actions = useMemo(() => ({
    hydrateInitial: (graph: GraphData, lensId: LensId) => {
      dispatch({ type: "HYDRATE_INITIAL", graph, lensId });
    },
    switchLensStart: (lensId: LensId) => {
      dispatch({ type: "SWITCH_LENS_START", lensId });
    },
    switchLensSuccess: (graph: GraphData, lensEdgeTypes: Set<EdgeType>) => {
      dispatch({ type: "SWITCH_LENS_SUCCESS", graph, lensEdgeTypes });
    },
    switchLensError: (error: string) => {
      dispatch({ type: "SWITCH_LENS_ERROR", error });
    },
    expandStart: () => {
      dispatch({ type: "EXPAND_START" });
    },
    expandSuccess: (nodes: Map<string, ExplorerNode>, edges: Map<string, ExplorerEdge>) => {
      dispatch({ type: "EXPAND_SUCCESS", nodes, edges });
    },
    expandError: (error: string) => {
      dispatch({ type: "EXPAND_ERROR", error });
    },
    removeNode: (nodeId: string) => {
      dispatch({ type: "REMOVE_NODE", nodeId });
    },
    selectNode: (nodeId: string, node: ExplorerNode) => {
      dispatch({ type: "SELECT_NODE", nodeId, node });
    },
    selectEdge: (edgeId: string, edge: ExplorerEdge) => {
      dispatch({ type: "SELECT_EDGE", edgeId, edge });
    },
    toggleMultiSelect: (nodeId: string, node: ExplorerNode) => {
      dispatch({ type: "TOGGLE_MULTI_SELECT", nodeId, node });
    },
    clearSelection: () => {
      dispatch({ type: "CLEAR_SELECTION" });
    },
    setFilters: (filters: GraphFilters) => {
      dispatch({ type: "SET_FILTERS", filters });
    },
    toggleEdgeType: (edgeType: EdgeType) => {
      dispatch({ type: "TOGGLE_EDGE_TYPE", edgeType });
    },
    setAllEdgeTypes: (edgeTypes: Set<EdgeType>) => {
      dispatch({ type: "SET_ALL_EDGE_TYPES", edgeTypes });
    },
    clearAllEdgeTypes: () => {
      dispatch({ type: "CLEAR_ALL_EDGE_TYPES" });
    },
    setLayout: (layout: ExplorerLayoutType) => {
      dispatch({ type: "SET_LAYOUT", layout });
    },
    setViewMode: (viewMode: ViewMode) => {
      dispatch({ type: "SET_VIEW_MODE", viewMode });
    },
    toggleLeftDrawer: () => {
      dispatch({ type: "TOGGLE_LEFT_DRAWER" });
    },
    toggleRightPanel: () => {
      dispatch({ type: "TOGGLE_RIGHT_PANEL" });
    },
    setRightPanel: (open: boolean) => {
      dispatch({ type: "SET_RIGHT_PANEL", open });
    },
  }), []);

  // Selectors - derived state
  const selectors = useMemo(() => ({
    elements: () => {
      if (state.status !== "ready") return [];
      return selectElements(state.graph, state.filters);
    },
    graphSummary: () => {
      if (state.status !== "ready") return { nodeTypeCounts: {} as Record<string, number>, edgeTypeCounts: {} as Record<string, number> };
      return selectGraphSummary(state.graph);
    },
    highlightedNodeIds: () => {
      if (state.status !== "ready") return undefined;
      return selectHighlightedNodeIds(state.selection);
    },
    highlightedEdgeId: () => {
      if (state.status !== "ready") return undefined;
      return selectHighlightedEdgeId(state.selection);
    },
    isExpanding: () => selectIsExpanding(state),
    getNode: (id: string) => {
      if (state.status !== "ready") return undefined;
      return state.graph.nodes.get(id);
    },
    getEdge: (id: string) => {
      if (state.status !== "ready") return undefined;
      return state.graph.edges.get(id);
    },
  }), [state]);

  const value = useMemo(
    () => ({ state, dispatch, actions, selectors }),
    [state, actions, selectors],
  );

  return (
    <ExplorerContext.Provider value={value}>
      {children}
    </ExplorerContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) {
    throw new Error("useExplorer must be used within an ExplorerProvider");
  }
  return context;
}

export function useExplorerState() {
  const { state } = useExplorer();
  return state;
}

export function useExplorerActions() {
  const { actions } = useExplorer();
  return actions;
}

export function useExplorerSelectors() {
  const { selectors } = useExplorer();
  return selectors;
}
