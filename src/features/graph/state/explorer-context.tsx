"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { EdgeType } from "../types/edge";
import type { GraphFilters } from "../types/filters";
import type { ExplorerEdge, ExplorerNode, InspectorMode } from "../types/node";
import type { ProvenanceEvent } from "../types/provenance";
import type {
  AsyncOperation,
  ExplorerLayoutType,
  ExplorerState,
  GraphData,
  TemplateId,
  ViewMode,
} from "../types/state";
import type { TemplateResultData } from "../types/template-results";
import {
  type ExplorerAction,
  explorerReducer,
  initialExplorerState,
} from "./reducer";
import {
  selectAsyncOperation,
  selectElements,
  selectGraphSummary,
  selectHighlightedEdgeId,
  selectHighlightedNodeIds,
  selectIsLoading,
} from "./selectors";

// =============================================================================
// CONTEXT TYPE
// =============================================================================

type ExplorerContextValue = {
  state: ExplorerState;
  dispatch: Dispatch<ExplorerAction>;
  actions: {
    hydrateInitial: (
      graph: GraphData,
      templateId: TemplateId,
      provenance: ProvenanceEvent,
    ) => void;
    switchTemplateStart: (templateId: TemplateId) => void;
    switchTemplateSuccess: (
      graph: GraphData,
      templateEdgeTypes: Set<EdgeType>,
      provenance: ProvenanceEvent,
    ) => void;
    switchTemplateError: (error: string) => void;
    setTemplateResults: (results: TemplateResultData | null) => void;
    expandStart: (nodeId: string, label: string) => void;
    expandSuccess: (
      nodes: Map<string, ExplorerNode>,
      edges: Map<string, ExplorerEdge>,
      provenance: ProvenanceEvent,
    ) => void;
    expandError: (error: string) => void;
    dismissExpansionError: () => void;
    variantTrailStart: (nodeId: string) => void;
    variantTrailSuccess: (
      nodes: Map<string, ExplorerNode>,
      edges: Map<string, ExplorerEdge>,
      provenance: ProvenanceEvent,
    ) => void;
    variantTrailError: (error: string) => void;
    dismissError: () => void;
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
    setInspectorMode: (mode: InspectorMode) => void;
  };
  selectors: {
    elements: () => ReturnType<typeof selectElements>;
    graphSummary: () => ReturnType<typeof selectGraphSummary>;
    highlightedNodeIds: () => Set<string> | undefined;
    highlightedEdgeId: () => string | undefined;
    /** @deprecated Use isLoading() instead */
    isExpanding: () => boolean;
    isLoading: () => boolean;
    asyncOperation: () => AsyncOperation;
    getNode: (id: string) => ExplorerNode | undefined;
    getEdge: (id: string) => ExplorerEdge | undefined;
    getProvenance: (id: string) => ProvenanceEvent[];
    getEdgesBetween: (sourceId: string, targetId: string) => ExplorerEdge[];
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

  const actions = useMemo(
    () => ({
      hydrateInitial: (
        graph: GraphData,
        templateId: TemplateId,
        provenance: ProvenanceEvent,
      ) => {
        dispatch({ type: "HYDRATE_INITIAL", graph, templateId, provenance });
      },
      switchTemplateStart: (templateId: TemplateId) => {
        dispatch({ type: "SWITCH_TEMPLATE_START", templateId });
      },
      switchTemplateSuccess: (
        graph: GraphData,
        templateEdgeTypes: Set<EdgeType>,
        provenance: ProvenanceEvent,
      ) => {
        dispatch({
          type: "SWITCH_TEMPLATE_SUCCESS",
          graph,
          templateEdgeTypes,
          provenance,
        });
      },
      switchTemplateError: (error: string) => {
        dispatch({ type: "SWITCH_TEMPLATE_ERROR", error });
      },
      setTemplateResults: (results: TemplateResultData | null) => {
        dispatch({ type: "SET_TEMPLATE_RESULTS", results });
      },
      expandStart: (nodeId: string, label: string) => {
        dispatch({ type: "EXPAND_START", nodeId, label });
      },
      expandSuccess: (
        nodes: Map<string, ExplorerNode>,
        edges: Map<string, ExplorerEdge>,
        provenance: ProvenanceEvent,
      ) => {
        dispatch({ type: "EXPAND_SUCCESS", nodes, edges, provenance });
      },
      expandError: (error: string) => {
        dispatch({ type: "EXPAND_ERROR", error });
      },
      dismissExpansionError: () => {
        dispatch({ type: "DISMISS_EXPANSION_ERROR" });
      },
      variantTrailStart: (nodeId: string) => {
        dispatch({ type: "VARIANT_TRAIL_START", nodeId });
      },
      variantTrailSuccess: (
        nodes: Map<string, ExplorerNode>,
        edges: Map<string, ExplorerEdge>,
        provenance: ProvenanceEvent,
      ) => {
        dispatch({ type: "VARIANT_TRAIL_SUCCESS", nodes, edges, provenance });
      },
      variantTrailError: (error: string) => {
        dispatch({ type: "VARIANT_TRAIL_ERROR", error });
      },
      dismissError: () => {
        dispatch({ type: "DISMISS_ERROR" });
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
      setInspectorMode: (mode: InspectorMode) => {
        dispatch({ type: "SET_INSPECTOR_MODE", mode });
      },
    }),
    [],
  );

  const selectors = useMemo(
    () => ({
      elements: () => {
        if (state.status !== "ready") return [];
        return selectElements(state.graph, state.filters);
      },
      graphSummary: () => {
        if (state.status !== "ready")
          return {
            nodeTypeCounts: {} as Record<string, number>,
            edgeTypeCounts: {} as Record<string, number>,
          };
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
      isExpanding: () => selectIsLoading(state),
      isLoading: () => selectIsLoading(state),
      asyncOperation: () => selectAsyncOperation(state),
      getNode: (id: string) => {
        if (state.status !== "ready") return undefined;
        return state.graph.nodes.get(id);
      },
      getEdge: (id: string) => {
        if (state.status !== "ready") return undefined;
        return state.graph.edges.get(id);
      },
      getProvenance: (id: string) => {
        if (state.status !== "ready") return [];
        return state.graph.provenance.get(id) ?? [];
      },
      getEdgesBetween: (sourceId: string, targetId: string) => {
        if (state.status !== "ready") return [];
        const result: ExplorerEdge[] = [];
        state.graph.edges.forEach((edge) => {
          if (
            (edge.sourceId === sourceId && edge.targetId === targetId) ||
            (edge.sourceId === targetId && edge.targetId === sourceId)
          ) {
            result.push(edge);
          }
        });
        return result;
      },
    }),
    [state],
  );

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
