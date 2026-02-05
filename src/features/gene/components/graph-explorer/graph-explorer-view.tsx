"use client";

import { Button } from "@shared/components/ui/button";
import { cn } from "@infra/utils";
import {
  ChevronRight,
  List,
  Loader2,
  Network,
  PanelLeft,
  PanelRight,
  SplitSquareVertical,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { ExplorerCytoscape } from "./explorer-cytoscape";
import {
  type GraphExplorerViewProps,
  type ExplorerNode,
  type ExplorerEdge,
  type ExplorerSelection,
  type ExplorerLayoutType,
  type ViewMode,
  type GraphFilters,
  type TraversalRecipe,
  type EdgeType,
  type EntityType,
  type GeneEntity,
  DEFAULT_SELECTION,
  DEFAULT_FILTERS,
  EXPLORER_LAYOUT_OPTIONS,
  transformToElements,
  createEdgeId,
  getGraphSummary,
} from "./types";
import { ControlsDrawer } from "./controls-drawer";
import { InspectorPanel } from "./inspector-panel";
import { fetchSubgraph } from "../../api";

// =============================================================================
// View Toggle Component
// =============================================================================

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <Button
        variant={viewMode === "graph" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => onViewModeChange("graph")}
        title="Graph View"
      >
        <Network className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => onViewModeChange("list")}
        title="List View"
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant={viewMode === "split" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => onViewModeChange("split")}
        title="Split View"
      >
        <SplitSquareVertical className="w-4 h-4" />
      </Button>
    </div>
  );
}

// =============================================================================
// Layout Selector Component
// =============================================================================

interface LayoutSelectorProps {
  layout: ExplorerLayoutType;
  onLayoutChange: (layout: ExplorerLayoutType) => void;
}

function LayoutSelector({ layout, onLayoutChange }: LayoutSelectorProps) {
  return (
    <select
      value={layout}
      onChange={(e) => onLayoutChange(e.target.value as ExplorerLayoutType)}
      className="h-8 px-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {EXPLORER_LAYOUT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function GraphExplorerViewInner({
  seedGeneId,
  seedGeneSymbol,
  schema,
  stats,
  className,
}: GraphExplorerViewProps) {
  // Create initial seed node
  const createSeedNode = useCallback((): ExplorerNode => ({
    id: seedGeneId,
    type: "Gene",
    label: seedGeneSymbol,
    entity: {
      type: "Gene",
      id: seedGeneId,
      label: seedGeneSymbol,
      symbol: seedGeneSymbol,
      ensemblId: seedGeneId,
    } as GeneEntity,
    isSeed: true,
    depth: 0,
  }), [seedGeneId, seedGeneSymbol]);

  // Graph state
  const [nodes, setNodes] = useState<Map<string, ExplorerNode>>(() => {
    const map = new Map<string, ExplorerNode>();
    map.set(seedGeneId, createSeedNode());
    return map;
  });
  const [edges, setEdges] = useState<Map<string, ExplorerEdge>>(new Map());
  const [seeds] = useState<Set<string>>(() => new Set([seedGeneId]));

  // UI state
  const [selection, setSelection] = useState<ExplorerSelection>(DEFAULT_SELECTION);
  const [filters, setFilters] = useState<GraphFilters>(() => ({
    ...DEFAULT_FILTERS,
    edgeTypes: new Set(DEFAULT_FILTERS.edgeTypes),
  }));
  const [layout, setLayout] = useState<ExplorerLayoutType>("cose-bilkent");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Expansion state
  const [isExpanding, setIsExpanding] = useState(false);

  // Memoized Cytoscape elements
  const elements = useMemo(() => {
    return transformToElements(nodes, edges, filters);
  }, [nodes, edges, filters]);

  // Graph summary (node and edge type counts)
  const { nodeTypeCounts, edgeTypeCounts } = useMemo(() => {
    return getGraphSummary(nodes, edges);
  }, [nodes, edges]);

  // Selected node IDs for multi-select highlighting
  const selectedNodeIds = useMemo(() => {
    if (selection.type === "multi") {
      return selection.nodeIds;
    }
    if (selection.type === "node") {
      return new Set([selection.nodeId]);
    }
    return undefined;
  }, [selection]);

  // Selected edge ID
  const selectedEdgeId = useMemo(() => {
    if (selection.type === "edge") {
      return selection.edgeId;
    }
    return undefined;
  }, [selection]);

  // ==========================================================================
  // Reset Handler
  // ==========================================================================

  const handleReset = useCallback(() => {
    // Reset to just seed node
    const map = new Map<string, ExplorerNode>();
    map.set(seedGeneId, createSeedNode());
    setNodes(map);
    setEdges(new Map());
    setSelection(DEFAULT_SELECTION);
    setRightPanelOpen(false);
  }, [seedGeneId, createSeedNode]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleNodeClick = useCallback((node: ExplorerNode, event?: MouseEvent) => {
    // Cmd/Ctrl+click for multi-select
    if (event?.metaKey || event?.ctrlKey) {
      setSelection((prev) => {
        if (prev.type === "multi") {
          const newIds = new Set(prev.nodeIds);
          if (newIds.has(node.id)) {
            newIds.delete(node.id);
          } else {
            newIds.add(node.id);
          }
          if (newIds.size === 0) {
            return DEFAULT_SELECTION;
          }
          return { type: "multi", nodeIds: newIds };
        }
        if (prev.type === "node" && prev.nodeId !== node.id) {
          return { type: "multi", nodeIds: new Set([prev.nodeId, node.id]) };
        }
        return { type: "node", nodeId: node.id, node };
      });
    } else {
      setSelection({ type: "node", nodeId: node.id, node });
      setRightPanelOpen(true);
    }
  }, []);

  const handleEdgeClick = useCallback((edge: ExplorerEdge) => {
    setSelection({ type: "edge", edgeId: edge.id, edge });
    setRightPanelOpen(true);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelection(DEFAULT_SELECTION);
  }, []);

  const handleNodeHover = useCallback((_node: ExplorerNode | null, _position: { x: number; y: number } | null) => {
    // Tooltip handling could go here
  }, []);

  // ==========================================================================
  // Graph Operations
  // ==========================================================================

  const expandNode = useCallback(async (nodeId: string, edgeTypes?: EdgeType[]) => {
    const node = nodes.get(nodeId);
    if (!node) return;

    setIsExpanding(true);

    try {
      const response = await fetchSubgraph({
        seeds: [{ type: node.type, id: nodeId }],
        maxDepth: 1,
        edgeTypes: edgeTypes ?? Array.from(filters.edgeTypes),
        nodeLimit: 100,
        edgeLimit: 200,
        includeProps: true,
      });

      if (!response?.data?.graph) {
        setIsExpanding(false);
        return;
      }

      const newNodes = new Map(nodes);
      const newEdges = new Map(edges);

      // Add new nodes
      response.data.graph.nodes.forEach((apiNode) => {
        if (!newNodes.has(apiNode.id)) {
          const explorerNode: ExplorerNode = {
            id: apiNode.id,
            type: apiNode.type as EntityType,
            label: apiNode.label,
            subtitle: apiNode.subtitle,
            entity: {
              type: apiNode.type,
              id: apiNode.id,
              label: apiNode.label,
            } as ExplorerNode["entity"],
            isSeed: seeds.has(apiNode.id),
            depth: (node.depth ?? 0) + 1,
          };
          newNodes.set(apiNode.id, explorerNode);
        }
      });

      // Add new edges
      response.data.graph.edges.forEach((apiEdge) => {
        const edgeType = apiEdge.type as EdgeType;
        const edgeId = createEdgeId(edgeType, apiEdge.from.id, apiEdge.to.id);
        if (!newEdges.has(edgeId)) {
          const explorerEdge: ExplorerEdge = {
            id: edgeId,
            type: edgeType,
            sourceId: apiEdge.from.id,
            targetId: apiEdge.to.id,
            numSources: apiEdge.props?.num_sources as number | undefined,
            numExperiments: apiEdge.props?.num_experiments as number | undefined,
            confidenceScores: apiEdge.props?.confidence_scores as number[] | undefined,
            evidence: {
              sources: apiEdge.props?.sources as string[] | undefined,
              pubmedIds: apiEdge.props?.pubmed_ids as string[] | undefined,
              detectionMethods: apiEdge.props?.detection_methods as string[] | undefined,
            },
          };
          newEdges.set(edgeId, explorerEdge);
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error("Failed to expand node:", error);
    } finally {
      setIsExpanding(false);
    }
  }, [nodes, edges, seeds, filters.edgeTypes]);

  const removeNode = useCallback((nodeId: string) => {
    // Don't remove seed nodes
    if (seeds.has(nodeId)) return;

    const newNodes = new Map(nodes);
    const newEdges = new Map(edges);

    newNodes.delete(nodeId);

    // Remove all edges connected to this node
    newEdges.forEach((edge, edgeId) => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        newEdges.delete(edgeId);
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Clear selection if removed node was selected
    if (selection.type === "node" && selection.nodeId === nodeId) {
      setSelection(DEFAULT_SELECTION);
    }
  }, [nodes, edges, seeds, selection]);

  const applyRecipe = useCallback(async (recipe: TraversalRecipe) => {
    // Apply recipe starting from all seed nodes
    setIsExpanding(true);

    try {
      const response = await fetchSubgraph({
        seeds: Array.from(seeds).map((id) => {
          const node = nodes.get(id);
          return { type: node?.type ?? "Gene", id };
        }),
        maxDepth: recipe.maxDepth,
        edgeTypes: recipe.edgeTypes,
        nodeLimit: recipe.nodeLimit,
        edgeLimit: recipe.nodeLimit * 2,
        includeProps: true,
      });

      if (!response?.data?.graph) {
        setIsExpanding(false);
        return;
      }

      const newNodes = new Map(nodes);
      const newEdges = new Map(edges);

      // Build BFS depth map
      const depths = new Map<string, number>();
      seeds.forEach((id) => depths.set(id, 0));

      // Process edges to calculate depths
      const edgeList = response.data.graph.edges;
      let changed = true;
      while (changed) {
        changed = false;
        for (const edge of edgeList) {
          const fromDepth = depths.get(edge.from.id);
          const toDepth = depths.get(edge.to.id);

          if (fromDepth !== undefined && toDepth === undefined) {
            depths.set(edge.to.id, fromDepth + 1);
            changed = true;
          } else if (toDepth !== undefined && fromDepth === undefined) {
            depths.set(edge.from.id, toDepth + 1);
            changed = true;
          }
        }
      }

      // Add new nodes with calculated depth
      response.data.graph.nodes.forEach((apiNode) => {
        if (!newNodes.has(apiNode.id)) {
          const depth = depths.get(apiNode.id) ?? recipe.maxDepth;

          const explorerNode: ExplorerNode = {
            id: apiNode.id,
            type: apiNode.type as EntityType,
            label: apiNode.label,
            subtitle: apiNode.subtitle,
            entity: {
              type: apiNode.type,
              id: apiNode.id,
              label: apiNode.label,
            } as ExplorerNode["entity"],
            isSeed: seeds.has(apiNode.id),
            depth,
          };
          newNodes.set(apiNode.id, explorerNode);
        }
      });

      // Add new edges
      response.data.graph.edges.forEach((apiEdge) => {
        const edgeType = apiEdge.type as EdgeType;
        const edgeId = createEdgeId(edgeType, apiEdge.from.id, apiEdge.to.id);
        if (!newEdges.has(edgeId)) {
          const explorerEdge: ExplorerEdge = {
            id: edgeId,
            type: edgeType,
            sourceId: apiEdge.from.id,
            targetId: apiEdge.to.id,
            numSources: apiEdge.props?.num_sources as number | undefined,
            numExperiments: apiEdge.props?.num_experiments as number | undefined,
            confidenceScores: apiEdge.props?.confidence_scores as number[] | undefined,
            evidence: {
              sources: apiEdge.props?.sources as string[] | undefined,
              pubmedIds: apiEdge.props?.pubmed_ids as string[] | undefined,
              detectionMethods: apiEdge.props?.detection_methods as string[] | undefined,
            },
          };
          newEdges.set(edgeId, explorerEdge);
        }
      });

      // Update filters to include recipe edge types
      setFilters((prev) => ({
        ...prev,
        edgeTypes: new Set([...prev.edgeTypes, ...recipe.edgeTypes]),
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error("Failed to apply recipe:", error);
    } finally {
      setIsExpanding(false);
    }
  }, [seeds, nodes, edges]);

  const getNode = useCallback((id: string) => nodes.get(id), [nodes]);
  const getEdge = useCallback((id: string) => edges.get(id), [edges]);

  const handleFindPaths = useCallback((_fromId: string, _toId: string) => {
    // Path finding will be implemented in Phase 3
  }, []);

  const closeInspector = useCallback(() => {
    setRightPanelOpen(false);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
          >
            {leftDrawerOpen ? <PanelLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-semibold text-slate-900">Graph Explorer</h1>
            <span className="text-sm text-slate-500">|</span>
            <span className="text-sm font-medium text-indigo-600">{seedGeneSymbol}</span>
          </div>

          {isExpanding && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <LayoutSelector layout={layout} onLayoutChange={setLayout} />
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Controls Drawer */}
        <ControlsDrawer
          open={leftDrawerOpen}
          onOpenChange={setLeftDrawerOpen}
          filters={filters}
          onFiltersChange={setFilters}
          layout={layout}
          onLayoutChange={setLayout}
          onApplyRecipe={applyRecipe}
          onReset={handleReset}
          edgeTypeCounts={edgeTypeCounts}
          nodeTypeCounts={nodeTypeCounts}
          isExpanding={isExpanding}
        />

        {/* Graph Canvas */}
        <div className="flex-1 min-w-0 relative">
          {viewMode !== "list" && (
            <ExplorerCytoscape
              elements={elements}
              layout={layout}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onEdgeClick={handleEdgeClick}
              onBackgroundClick={handleBackgroundClick}
              selectedNodeIds={selectedNodeIds}
              selectedEdgeId={selectedEdgeId}
              className="absolute inset-0"
            />
          )}

          {viewMode === "list" && (
            <div className="absolute inset-0 overflow-auto p-4">
              <div className="text-sm text-slate-500">
                List view coming soon...
              </div>
            </div>
          )}

          {viewMode === "split" && (
            <div className="absolute bottom-0 left-0 right-0 h-1/3 border-t border-slate-200 bg-white overflow-auto p-4">
              <div className="text-sm text-slate-500">
                Split view list coming soon...
              </div>
            </div>
          )}

          {/* Empty state hint */}
          {nodes.size === 1 && edges.size === 0 && !isExpanding && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center max-w-md">
                <Network className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Exploring</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Click one of the relationship buttons on the left to explore connections for <strong>{seedGeneSymbol}</strong>.
                </p>
                <p className="text-xs text-slate-400">
                  Try "Disease Associations" or "Pathway Membership" to see related entities.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        {rightPanelOpen && (
          <InspectorPanel
            selection={selection}
            getNode={getNode}
            getEdge={getEdge}
            onExpandNode={expandNode}
            onRemoveNode={removeNode}
            onFindPaths={handleFindPaths}
            onClose={closeInspector}
            isExpanding={isExpanding}
          />
        )}
      </div>
    </div>
  );
}

export const GraphExplorerView = memo(GraphExplorerViewInner);
