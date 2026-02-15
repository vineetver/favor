"use client";

import { Button } from "@shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@shared/components/ui/sheet";
import {
  TooltipProvider,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import {
  ChevronRight,
  List,
  Loader2,
  Network,
  PanelLeft,
  SplitSquareVertical,
} from "lucide-react";
import { toast } from "sonner";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExplorerCytoscape } from "./explorer-cytoscape";
import { ControlsDrawer } from "./controls-drawer";
import { InspectorPanel } from "./inspector-panel";
import { EdgeTooltip } from "./edge-tooltip";
import { useExplorerState, useExplorerActions, useExplorerSelectors } from "../state";
import { hydrateSubgraphData, hydrateQueryResponse } from "../utils/hydration";
import { GRAPH_LENSES, getLensEdgeFields } from "../config/lenses";
import { EXPLORER_LAYOUT_OPTIONS } from "../config/layout";
import { fetchSubgraph, fetchGraphQuery, parseTypeId } from "../api";
import type { GraphExplorerViewProps, VariantTrailResultData } from "../types/props";
import type { ExplorerNode, ExplorerEdge, HoveredEdgeInfo } from "../types/node";
import type { GeneEntity, EntityType } from "../types/entity";
import type { EdgeType } from "../types/edge";
import { getEdgeFieldsForTypes } from "../types/edge";
import type { ExplorerLayoutType, ViewMode, LensId } from "../types/state";
import type { ExpansionConfig } from "../config/expansion";
import { VARIANT_TRAIL_CONFIG } from "../config/variant-trail";
import { makeNodeKey, makeEdgeKey } from "../types/keys";
import { createEdgeId } from "../utils/keys";
import { createProvenanceEvent } from "../types/provenance";

// =============================================================================
// View Toggle Component
// =============================================================================

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
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
      className="h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
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
// (Sheet is used directly from shadcn — no custom wrapper needed)
// =============================================================================

// =============================================================================
// Main Component
// =============================================================================

function GraphExplorerViewInner({
  seedGeneId,
  seedGeneSymbol,
  schema,
  stats,
  initialSubgraph,
  initialLensId,
  className,
}: GraphExplorerViewProps) {
  const state = useExplorerState();
  const actions = useExplorerActions();
  const selectors = useExplorerSelectors();

  // Local state for edge hover tooltip
  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdgeInfo | null>(null);

  // Variant trail cache + active result
  const variantTrailCache = useRef<Map<string, VariantTrailResultData>>(new Map());
  const [activeTrailResult, setActiveTrailResult] = useState<VariantTrailResultData | null>(null);

  // Hydrate initial data on mount
  useEffect(() => {
    if (state.status !== "idle") return;

    const seedSet = new Set([seedGeneId]);

    const lensId = initialLensId ?? "clinical";
    const lensName = GRAPH_LENSES.find((l) => l.id === lensId)?.name ?? lensId;
    const initialProv = createProvenanceEvent("lens", `${lensName} lens (initial)`, { lensId });

    if (initialSubgraph && initialSubgraph.edges.length > 0) {
      const { nodes, edges } = hydrateSubgraphData(initialSubgraph, seedGeneId, seedGeneSymbol, seedSet);
      actions.hydrateInitial({ nodes, edges, seeds: seedSet, provenance: new Map() }, lensId, initialProv);
    } else {
      // Just the seed node
      const seedKey = makeNodeKey("Gene", seedGeneId);
      const seedNode: ExplorerNode = {
        id: seedGeneId,
        key: seedKey,
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
      };
      const nodes = new Map<string, ExplorerNode>();
      nodes.set(seedGeneId, seedNode);
      actions.hydrateInitial({ nodes, edges: new Map(), seeds: seedSet, provenance: new Map() }, lensId, initialProv);
    }
  }, [state.status, seedGeneId, seedGeneSymbol, initialSubgraph, initialLensId, actions]);

  // Derived state from selectors
  const elements = useMemo(() => selectors.elements(), [selectors]);
  const { nodeTypeCounts, edgeTypeCounts } = useMemo(() => selectors.graphSummary(), [selectors]);
  const selectedNodeIds = useMemo(() => selectors.highlightedNodeIds(), [selectors]);
  const selectedEdgeId = useMemo(() => selectors.highlightedEdgeId(), [selectors]);
  const isExpanding = selectors.isExpanding();

  // Ready-state shortcuts
  const readyState = state.status === "ready" ? state : null;
  const selection = readyState?.selection ?? { type: "none" as const };
  const filters = readyState?.filters ?? { edgeTypes: new Set<EdgeType>(), minSources: 0, minExperiments: 0, maxDepth: 4, showOrphans: true };
  const layout = readyState?.layout ?? "cose-bilkent";
  const viewMode = readyState?.viewMode ?? "graph";
  const activeLens = readyState?.activeLens ?? "clinical";
  const leftDrawerOpen = readyState?.leftDrawerOpen ?? true;
  const inspectorMode = readyState?.inspectorMode ?? "closed";
  const graphEdgesSize = readyState?.graph.edges.size ?? 0;

  // ==========================================================================
  // Keyboard: Esc closes inspector
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectorMode !== "closed") {
        actions.setInspectorMode("closed");
        actions.clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectorMode, actions]);

  // ==========================================================================
  // Clear variant trail on selection change
  // ==========================================================================

  useEffect(() => {
    if (selection.type !== "node") {
      setActiveTrailResult(null);
    } else if (activeTrailResult && activeTrailResult.seedNodeId !== selection.nodeId) {
      setActiveTrailResult(null);
    }
  }, [selection, activeTrailResult]);

  // ==========================================================================
  // Lens Switching (async — stays in component)
  // ==========================================================================

  const switchLens = useCallback(async (lensId: LensId) => {
    const lens = GRAPH_LENSES.find((l) => l.id === lensId);
    if (!lens) return;

    // Clear variant trail cache and active result on lens switch
    variantTrailCache.current.clear();
    setActiveTrailResult(null);

    actions.switchLensStart(lensId);
    const prov = createProvenanceEvent("lens", `${lens.name} lens`, { lensId });

    try {
      const response = await fetchGraphQuery({
        seeds: [{ type: "Gene", id: seedGeneId }],
        steps: lens.steps.map((s) => ({
          edgeTypes: s.edgeTypes,
          direction: s.direction,
          limit: s.limit,
          sort: s.sort,
          filters: s.filters,
        })),
        select: { edgeFields: getLensEdgeFields(lens) },
        limits: lens.limits,
      });

      if (!response?.data?.edges?.length) {
        const seedKey = makeNodeKey("Gene", seedGeneId);
        const seedNode: ExplorerNode = {
          id: seedGeneId,
          key: seedKey,
          type: "Gene",
          label: seedGeneSymbol,
          entity: { type: "Gene", id: seedGeneId, label: seedGeneSymbol, symbol: seedGeneSymbol, ensemblId: seedGeneId } as GeneEntity,
          isSeed: true,
          depth: 0,
        };
        const nodes = new Map<string, ExplorerNode>();
        nodes.set(seedGeneId, seedNode);
        actions.switchLensSuccess(
          { nodes, edges: new Map(), seeds: new Set([seedGeneId]), provenance: new Map() },
          new Set<EdgeType>(),
          prov,
        );
        return;
      }

      const seedSet = new Set([seedGeneId]);
      const { nodes: newNodes, edges: newEdges } = hydrateQueryResponse(response, seedGeneId, seedGeneSymbol, seedSet);

      const lensEdgeTypes = new Set<EdgeType>();
      for (const step of lens.steps) {
        for (const et of step.edgeTypes) lensEdgeTypes.add(et);
      }
      for (const edge of response.data.edges) {
        lensEdgeTypes.add(edge.type as EdgeType);
      }

      actions.switchLensSuccess({ nodes: newNodes, edges: newEdges, seeds: seedSet, provenance: new Map() }, lensEdgeTypes, prov);
    } catch (error) {
      console.error("Failed to switch lens:", error);
      actions.switchLensError(String(error));
    }
  }, [seedGeneId, seedGeneSymbol, actions]);

  const handleReset = useCallback(() => {
    switchLens(activeLens);
  }, [activeLens, switchLens]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleNodeClick = useCallback((node: ExplorerNode, event?: MouseEvent) => {
    if (event?.metaKey || event?.ctrlKey) {
      actions.toggleMultiSelect(node.id, node);
    } else {
      actions.selectNode(node.id, node);
    }
  }, [actions]);

  const handleEdgeClick = useCallback((edge: ExplorerEdge) => {
    actions.selectEdge(edge.id, edge);
  }, [actions]);

  const handleBackgroundClick = useCallback(() => {
    actions.clearSelection();
  }, [actions]);

  const handleNodeHover = useCallback((_node: ExplorerNode | null, _position: { x: number; y: number } | null) => {
    // Node tooltip handling in future
  }, []);

  const handleEdgeHover = useCallback((edge: ExplorerEdge | null, position: { x: number; y: number } | null) => {
    if (!edge || !position) {
      setHoveredEdge(null);
      return;
    }
    // Look up source/target labels from graph
    const sourceNode = selectors.getNode(edge.sourceId);
    const targetNode = selectors.getNode(edge.targetId);
    setHoveredEdge({
      edge,
      sourceLabel: sourceNode?.label ?? edge.sourceId,
      targetLabel: targetNode?.label ?? edge.targetId,
      position,
    });
  }, [selectors]);

  const handleNodeDoubleClick = useCallback((_node: ExplorerNode) => {
    // Placeholder for Focus mode (future phase)
  }, []);

  // ==========================================================================
  // Graph Operations (async — stays in component)
  // ==========================================================================

  const expandNode = useCallback(async (nodeId: string, expansion?: ExpansionConfig) => {
    const node = selectors.getNode(nodeId);
    if (!node) return;

    actions.expandStart();

    const expandProv = expansion
      ? createProvenanceEvent("typed_expand", `${expansion.label} from ${node.label}`, { sourceNodeId: nodeId, sourceNodeLabel: node.label })
      : createProvenanceEvent("bfs_expand", `Expand all from ${node.label}`, { sourceNodeId: nodeId, sourceNodeLabel: node.label });

    try {
      if (expansion) {
        const response = await fetchGraphQuery({
          seeds: [{ type: node.type, id: nodeId }],
          steps: [{
            edgeTypes: expansion.edgeTypes,
            direction: expansion.direction,
            limit: expansion.limit ?? 20,
            sort: expansion.sort,
          }],
          select: { edgeFields: getEdgeFieldsForTypes(expansion.edgeTypes as EdgeType[]) },
          limits: { maxNodes: 200, maxEdges: 500 },
        });

        if (!response?.data?.edges?.length) {
          actions.dismissExpansionError();
          toast.error("No relationships found for this expansion.");
          return;
        }

        const newNodes = new Map<string, ExplorerNode>();
        const newEdges = new Map<string, ExplorerEdge>();

        for (const [, nodeData] of Object.entries(response.data.nodes)) {
          const entity = nodeData.entity;
          const nodeType = entity.type as EntityType;
          const nodeKey = makeNodeKey(nodeType, entity.id);
          newNodes.set(entity.id, {
            id: entity.id,
            key: nodeKey,
            type: nodeType,
            label: entity.label,
            subtitle: entity.subtitle,
            entity: { type: entity.type, id: entity.id, label: entity.label } as ExplorerNode["entity"],
            isSeed: false,
            depth: (node.depth ?? 0) + 1,
          });
        }

        for (const apiEdge of response.data.edges) {
          const edgeType = apiEdge.type as EdgeType;
          const fromId = parseTypeId(apiEdge.from).id;
          const toId = parseTypeId(apiEdge.to).id;
          const edgeId = createEdgeId(edgeType, fromId, toId);
          const fromType = parseTypeId(apiEdge.from).type as EntityType;
          const toType = parseTypeId(apiEdge.to).type as EntityType;
          const sourceKey = makeNodeKey(fromType, fromId);
          const targetKey = makeNodeKey(toType, toId);
          newEdges.set(edgeId, {
            id: edgeId,
            key: makeEdgeKey(edgeType, sourceKey, targetKey),
            type: edgeType,
            sourceId: fromId,
            targetId: toId,
            sourceKey,
            targetKey,
            numSources: apiEdge.fields?.num_sources as number | undefined,
            numExperiments: apiEdge.fields?.num_experiments as number | undefined,
            fields: apiEdge.fields,
          });
        }

        actions.expandSuccess(newNodes, newEdges, expandProv);
      } else {
        const response = await fetchSubgraph({
          seeds: [{ type: node.type, id: nodeId }],
          maxDepth: 1,
          edgeTypes: readyState ? Array.from(readyState.filters.edgeTypes) : [],
          nodeLimit: 100,
          edgeLimit: 200,
          includeProps: true,
        });

        if (!response?.data?.graph) {
          actions.dismissExpansionError();
          toast.error("No relationships found for this expansion.");
          return;
        }

        const newNodes = new Map<string, ExplorerNode>();
        const newEdges = new Map<string, ExplorerEdge>();

        response.data.graph.nodes.forEach((apiNode) => {
          const nodeType = apiNode.type as EntityType;
          const nodeKey = makeNodeKey(nodeType, apiNode.id);
          newNodes.set(apiNode.id, {
            id: apiNode.id,
            key: nodeKey,
            type: nodeType,
            label: apiNode.label,
            subtitle: apiNode.subtitle,
            entity: { type: apiNode.type, id: apiNode.id, label: apiNode.label } as ExplorerNode["entity"],
            isSeed: false,
            depth: (node.depth ?? 0) + 1,
          });
        });

        response.data.graph.edges.forEach((apiEdge) => {
          const edgeType = apiEdge.type as EdgeType;
          const edgeId = createEdgeId(edgeType, apiEdge.from.id, apiEdge.to.id);
          const sourceKey = makeNodeKey(apiEdge.from.type as EntityType, apiEdge.from.id);
          const targetKey = makeNodeKey(apiEdge.to.type as EntityType, apiEdge.to.id);
          newEdges.set(edgeId, {
            id: edgeId,
            key: makeEdgeKey(edgeType, sourceKey, targetKey),
            type: edgeType,
            sourceId: apiEdge.from.id,
            targetId: apiEdge.to.id,
            sourceKey,
            targetKey,
            numSources: apiEdge.props?.num_sources as number | undefined,
            numExperiments: apiEdge.props?.num_experiments as number | undefined,
            confidenceScores: apiEdge.props?.confidence_scores as number[] | undefined,
            evidence: {
              sources: apiEdge.props?.sources as string[] | undefined,
              pubmedIds: apiEdge.props?.pubmed_ids as string[] | undefined,
              detectionMethods: apiEdge.props?.detection_methods as string[] | undefined,
            },
            fields: apiEdge.props as Record<string, unknown> | undefined,
          });
        });

        actions.expandSuccess(newNodes, newEdges, expandProv);
      }
    } catch (error: unknown) {
      console.error("Failed to expand node:", error);
      actions.dismissExpansionError();
      const is404 =
        (error instanceof Response && error.status === 404) ||
        (error instanceof Error && (error.message.includes("404") || error.message.includes("Not Found")));
      toast.error(
        is404
          ? "Entity not found — this node may not exist in the knowledge graph."
          : `Expansion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [selectors, actions, readyState]);

  // ==========================================================================
  // Variant Trail (async — multi-step route to find Variants)
  // ==========================================================================

  const runVariantTrail = useCallback(async (nodeId: string) => {
    const node = selectors.getNode(nodeId);
    if (!node) return;

    const config = VARIANT_TRAIL_CONFIG[node.type];
    if (!config) return;

    // Check cache
    const cacheKey = `${node.type}:${nodeId}`;
    const cached = variantTrailCache.current.get(cacheKey);
    if (cached) {
      setActiveTrailResult(cached);
      return;
    }

    actions.expandStart();

    const trailProv = createProvenanceEvent("variant_trail", `Variant trail from ${node.label}`, {
      sourceNodeId: nodeId,
      sourceNodeLabel: node.label,
    });

    try {
      const allNewNodes = new Map<string, ExplorerNode>();
      const allNewEdges = new Map<string, ExplorerEdge>();
      const variantEntries: Array<{ node: ExplorerNode; connectingEdge: ExplorerEdge; routeBadge: string }> = [];
      const seenVariantIds = new Set<string>();

      for (const route of config.routes) {
        // Collect all edge types across all steps for edge field selection
        const allEdgeTypes = route.steps.flatMap((s) => s.edgeTypes) as EdgeType[];

        const response = await fetchGraphQuery({
          seeds: [{ type: node.type, id: nodeId }],
          steps: route.steps.map((s) => ({
            edgeTypes: s.edgeTypes,
            direction: s.direction,
            limit: s.limit,
            sort: s.sort,
          })),
          select: { edgeFields: getEdgeFieldsForTypes(allEdgeTypes) },
          limits: { maxNodes: config.maxNodes, maxEdges: config.maxEdges },
        });

        if (!response?.data?.edges?.length) continue;

        // Hydrate nodes
        for (const [, nodeData] of Object.entries(response.data.nodes)) {
          const entity = nodeData.entity;
          const nodeType = entity.type as EntityType;
          const nodeKey = makeNodeKey(nodeType, entity.id);
          allNewNodes.set(entity.id, {
            id: entity.id,
            key: nodeKey,
            type: nodeType,
            label: entity.label,
            subtitle: entity.subtitle,
            entity: { type: entity.type, id: entity.id, label: entity.label } as ExplorerNode["entity"],
            isSeed: false,
            depth: (node.depth ?? 0) + route.steps.length,
          });
        }

        // Hydrate edges + extract Variant nodes with connecting edges
        for (const apiEdge of response.data.edges) {
          const edgeType = apiEdge.type as EdgeType;
          const fromId = parseTypeId(apiEdge.from).id;
          const toId = parseTypeId(apiEdge.to).id;
          const edgeId = createEdgeId(edgeType, fromId, toId);
          const fromType = parseTypeId(apiEdge.from).type as EntityType;
          const toType = parseTypeId(apiEdge.to).type as EntityType;
          const sourceKey = makeNodeKey(fromType, fromId);
          const targetKey = makeNodeKey(toType, toId);
          const hydratedEdge: ExplorerEdge = {
            id: edgeId,
            key: makeEdgeKey(edgeType, sourceKey, targetKey),
            type: edgeType,
            sourceId: fromId,
            targetId: toId,
            sourceKey,
            targetKey,
            numSources: apiEdge.fields?.num_sources as number | undefined,
            numExperiments: apiEdge.fields?.num_experiments as number | undefined,
            fields: apiEdge.fields,
          };
          allNewEdges.set(edgeId, hydratedEdge);

          // Check if either end is a Variant node (deduplicate by ID, first route wins)
          if (fromType === "Variant" && !seenVariantIds.has(fromId)) {
            seenVariantIds.add(fromId);
            const variantNode = allNewNodes.get(fromId);
            if (variantNode) {
              variantEntries.push({ node: variantNode, connectingEdge: hydratedEdge, routeBadge: route.routeBadge });
            }
          }
          if (toType === "Variant" && !seenVariantIds.has(toId)) {
            seenVariantIds.add(toId);
            const variantNode = allNewNodes.get(toId);
            if (variantNode) {
              variantEntries.push({ node: variantNode, connectingEdge: hydratedEdge, routeBadge: route.routeBadge });
            }
          }
        }
      }

      // Merge into graph
      actions.expandSuccess(allNewNodes, allNewEdges, trailProv);

      // Build result
      const result: VariantTrailResultData = {
        seedNodeId: nodeId,
        seedNodeType: node.type,
        seedNodeLabel: node.label,
        variants: variantEntries,
        totalFound: variantEntries.length,
        timestamp: Date.now(),
      };

      // Cache and set active
      variantTrailCache.current.set(cacheKey, result);
      setActiveTrailResult(result);

      if (variantEntries.length === 0) {
        toast.error("No variant evidence found via this route.");
      }
    } catch (error: unknown) {
      console.error("Variant trail failed:", error);
      actions.dismissExpansionError();
      toast.error(
        `Variant trail failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [selectors, actions]);

  const removeNode = useCallback((nodeId: string) => {
    actions.removeNode(nodeId);
  }, [actions]);

  const getNode = useCallback((id: string) => selectors.getNode(id), [selectors]);
  const getEdge = useCallback((id: string) => selectors.getEdge(id), [selectors]);
  const getProvenance = useCallback((id: string) => selectors.getProvenance(id), [selectors]);
  const getEdgesBetween = useCallback((sourceId: string, targetId: string) => selectors.getEdgesBetween(sourceId, targetId), [selectors]);

  const handleFindPaths = useCallback((_fromId: string, _toId: string) => {
    // Path finding will be implemented in a future phase
  }, []);

  const handleClearTrailResult = useCallback(() => {
    setActiveTrailResult(null);
  }, []);

  const handleSelectTrailVariant = useCallback((node: ExplorerNode) => {
    actions.selectNode(node.id, node);
  }, [actions]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col h-full bg-background", className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={actions.toggleLeftDrawer}
            >
              {leftDrawerOpen ? <PanelLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Graph Explorer</h1>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm font-medium text-primary">{seedGeneSymbol}</span>
            </div>

            {isExpanding && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <LayoutSelector layout={layout} onLayoutChange={actions.setLayout} />
            <ViewToggle viewMode={viewMode} onViewModeChange={actions.setViewMode} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Controls Drawer */}
          <ControlsDrawer
            open={leftDrawerOpen}
            onOpenChange={(open) => open !== leftDrawerOpen && actions.toggleLeftDrawer()}
            filters={filters}
            onFiltersChange={actions.setFilters}
            layout={layout}
            onLayoutChange={actions.setLayout}
            activeLens={activeLens}
            onLensChange={switchLens}
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
                onEdgeHover={handleEdgeHover}
                onNodeDoubleClick={handleNodeDoubleClick}
                onBackgroundClick={handleBackgroundClick}
                selectedNodeIds={selectedNodeIds}
                selectedEdgeId={selectedEdgeId}
                className="absolute inset-0"
              />
            )}

            {viewMode === "list" && (
              <div className="absolute inset-0 overflow-auto p-4">
                <div className="text-sm text-muted-foreground">
                  List view coming soon...
                </div>
              </div>
            )}

            {viewMode === "split" && (
              <div className="absolute bottom-0 left-0 right-0 h-1/3 border-t border-border bg-background overflow-auto p-4">
                <div className="text-sm text-muted-foreground">
                  Split view list coming soon...
                </div>
              </div>
            )}

            {/* No results for this lens */}
            {graphEdgesSize === 0 && !isExpanding && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center max-w-md">
                  <Network className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Results</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    No relationships found for <strong>{seedGeneSymbol}</strong> with the current lens. Try switching to a different lens.
                  </p>
                </div>
              </div>
            )}

            {/* Edge Tooltip (follows cursor on edge hover) */}
            <EdgeTooltip info={hoveredEdge} />
          </div>
        </div>

        {/* Inspector Sheet (global overlay, no backdrop) */}
        <Sheet
          open={inspectorMode !== "closed"}
          onOpenChange={(open) => {
            if (!open) {
              actions.setInspectorMode("closed");
              actions.clearSelection();
            }
          }}
          modal={false}
        >
          <SheetContent
            side="right"
            showOverlay={false}
            showClose
            className="w-80 sm:max-w-sm p-0 flex flex-col"
          >
            <SheetHeader className="px-4 py-3 border-b border-border bg-muted">
              <SheetTitle className="text-sm font-medium">Inspector</SheetTitle>
              <SheetDescription className="sr-only">
                Inspect selected nodes and edges
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <InspectorPanel
                selection={selection}
                getNode={getNode}
                getEdge={getEdge}
                getProvenance={getProvenance}
                getEdgesBetween={getEdgesBetween}
                onExpandNode={expandNode}
                onRemoveNode={removeNode}
                onFindPaths={handleFindPaths}
                isExpanding={isExpanding}
                onRunVariantTrail={runVariantTrail}
                activeTrailResult={activeTrailResult}
                onClearTrailResult={handleClearTrailResult}
                onSelectTrailVariant={handleSelectTrailVariant}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

export const GraphExplorerView = memo(GraphExplorerViewInner);
