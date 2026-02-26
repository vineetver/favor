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
import { RankedResultsList } from "./ranked-results-list";
import { useExplorerState, useExplorerActions, useExplorerSelectors } from "../state";
import { hydrateSubgraphData, hydrateQueryResponse } from "../utils/hydration";
import { getLensEdgeFields, serializeLensSteps, isBranchStep } from "../config/lenses";
import { EXPLORER_LAYOUT_OPTIONS } from "../config/layout";
import { fetchSubgraph, fetchGraphQuery, parseTypeId } from "../api";
import type { GraphExplorerViewProps, VariantTrailResultData } from "../types/props";
import type { ExplorerNode, ExplorerEdge, HoveredEdgeInfo } from "../types/node";
import type { EntityType } from "../types/entity";
import type { EdgeType } from "../types/edge";
import { getEdgeFieldsForTypes, batchEdgeTypesByFieldLimit } from "../types/edge";
import type { ExplorerLayoutType, ViewMode, TemplateId } from "../types/state";
import type { ExpansionConfig } from "../config/expansion";
import type { ExplorerTemplate } from "../config/explorer-config";
import type { TemplateResultData, TemplateResultEntry } from "../types/template-results";
import { VARIANT_TRAIL_CONFIG } from "../config/variant-trail";
import { makeNodeKey, makeEdgeKey } from "../types/keys";
import { createEdgeId } from "../utils/keys";
import { createProvenanceEvent } from "../types/provenance";
import { useConnectionsDrilldown } from "../hooks/use-connections-drilldown";

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
// Extract Ranked Results from query response
// =============================================================================

function extractTemplateResults(
  template: ExplorerTemplate,
  nodes: Map<string, ExplorerNode>,
  edges: Map<string, ExplorerEdge>,
  seedId: string,
): TemplateResultData {
  const targetNodes: TemplateResultEntry[] = [];

  nodes.forEach((node) => {
    if (node.id === seedId) return;
    if (node.type !== template.targetEntityType) return;

    // Find connecting edge (any edge between seed and target node)
    let connectingEdge: ExplorerEdge | undefined;
    let rankValue: number | null = null;

    edges.forEach((edge) => {
      if (connectingEdge) return; // take first found
      const connects =
        (edge.sourceId === seedId && edge.targetId === node.id) ||
        (edge.targetId === seedId && edge.sourceId === node.id);
      if (!connects) {
        // Also check indirect connections (1-hop from seed)
        const sourceNode = nodes.get(edge.sourceId);
        const targetNode = nodes.get(edge.targetId);
        if (
          (edge.targetId === node.id && sourceNode?.isSeed) ||
          (edge.sourceId === node.id && targetNode?.isSeed)
        ) {
          connectingEdge = edge;
        }
      } else {
        connectingEdge = edge;
      }
    });

    // If no direct/indirect edge found, find ANY edge touching this node
    if (!connectingEdge) {
      edges.forEach((edge) => {
        if (connectingEdge) return;
        if (edge.sourceId === node.id || edge.targetId === node.id) {
          connectingEdge = edge;
        }
      });
    }

    if (!connectingEdge) return;

    // Extract rank value from the connecting edge's fields
    if (template.rankBy && connectingEdge.fields) {
      const val = connectingEdge.fields[template.rankBy.field];
      if (typeof val === "number") {
        rankValue = val;
      }
    }

    targetNodes.push({ node, connectingEdge, rankValue });
  });

  // Sort by rank value
  if (template.rankBy) {
    const dir = template.rankBy.direction === "desc" ? -1 : 1;
    targetNodes.sort((a, b) => {
      if (a.rankValue === null && b.rankValue === null) return 0;
      if (a.rankValue === null) return 1;
      if (b.rankValue === null) return -1;
      return (a.rankValue - b.rankValue) * dir;
    });
  }

  return {
    templateId: template.id,
    targetEntityType: template.targetEntityType,
    rankLabel: template.rankBy?.label,
    results: targetNodes,
  };
}

// =============================================================================
// Main Component
// =============================================================================

function GraphExplorerViewInner({
  seed,
  config,
  schema,
  stats,
  initialSubgraph,
  initialTemplateId,
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

    const seedSet = new Set([seed.id]);

    const templateId = initialTemplateId ?? config.defaultTemplateId;
    const template = config.templates.find((t) => t.id === templateId);
    const templateName = template?.name ?? templateId;
    const initialProv = createProvenanceEvent("lens", `${templateName} template (initial)`, { templateId });

    if (initialSubgraph && initialSubgraph.edges.length > 0) {
      const { nodes, edges } = hydrateSubgraphData(initialSubgraph, seed, seedSet);
      actions.hydrateInitial({ nodes, edges, seeds: seedSet, provenance: new Map() }, templateId, initialProv);

      // Extract ranked results from initial data
      if (template) {
        const results = extractTemplateResults(template, nodes, edges, seed.id);
        actions.setTemplateResults(results);
      }
    } else {
      // Just the seed node
      const seedKey = makeNodeKey(seed.type, seed.id);
      const seedNode: ExplorerNode = {
        id: seed.id,
        key: seedKey,
        type: seed.type,
        label: seed.label,
        entity: {
          type: seed.type,
          id: seed.id,
          label: seed.label,
        } as ExplorerNode["entity"],
        isSeed: true,
        depth: 0,
      };
      const nodes = new Map<string, ExplorerNode>();
      nodes.set(seed.id, seedNode);
      actions.hydrateInitial({ nodes, edges: new Map(), seeds: seedSet, provenance: new Map() }, templateId, initialProv);
    }
  }, [state.status, seed.id, seed.label, seed.type, initialSubgraph, initialTemplateId, config, actions]);

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
  const activeTemplate = readyState?.activeTemplate ?? config.defaultTemplateId;
  const templateResults = readyState?.templateResults ?? null;
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
  // Template Switching (async — stays in component)
  // ==========================================================================

  const switchTemplate = useCallback(async (templateId: TemplateId) => {
    const template = config.templates.find((t) => t.id === templateId);
    if (!template) return;

    // Clear variant trail cache and active result on template switch
    variantTrailCache.current.clear();
    setActiveTrailResult(null);

    actions.switchTemplateStart(templateId);
    const prov = createProvenanceEvent("lens", `${template.name} template`, { templateId });

    try {
      const response = await fetchGraphQuery({
        seeds: [{ type: seed.type, id: seed.id }],
        steps: serializeLensSteps(template.steps),
        select: { edgeFields: getLensEdgeFields(template as Parameters<typeof getLensEdgeFields>[0]) },
        limits: template.limits,
      });

      if (!response?.data?.edges?.length) {
        const seedKey = makeNodeKey(seed.type, seed.id);
        const seedNode: ExplorerNode = {
          id: seed.id,
          key: seedKey,
          type: seed.type,
          label: seed.label,
          entity: { type: seed.type, id: seed.id, label: seed.label } as ExplorerNode["entity"],
          isSeed: true,
          depth: 0,
        };
        const nodes = new Map<string, ExplorerNode>();
        nodes.set(seed.id, seedNode);
        actions.switchTemplateSuccess(
          { nodes, edges: new Map(), seeds: new Set([seed.id]), provenance: new Map() },
          new Set<EdgeType>(),
          prov,
        );
        actions.setTemplateResults(null);
        return;
      }

      const seedSet = new Set([seed.id]);
      const { nodes: newNodes, edges: newEdges } = hydrateQueryResponse(response, seed, seedSet);

      const templateEdgeTypes = new Set<EdgeType>();
      for (const step of template.steps) {
        if (isBranchStep(step)) {
          for (const sub of step.branch) {
            for (const et of sub.edgeTypes) templateEdgeTypes.add(et);
          }
        } else {
          for (const et of step.edgeTypes) templateEdgeTypes.add(et);
        }
      }
      for (const edge of response.data.edges) {
        templateEdgeTypes.add(edge.type as EdgeType);
      }

      actions.switchTemplateSuccess({ nodes: newNodes, edges: newEdges, seeds: seedSet, provenance: new Map() }, templateEdgeTypes, prov);

      // Extract ranked results
      const results = extractTemplateResults(template, newNodes, newEdges, seed.id);
      actions.setTemplateResults(results);
    } catch (error) {
      console.error("Failed to switch template:", error);
      actions.switchTemplateError(String(error));
    }
  }, [seed, config.templates, actions]);

  const handleReset = useCallback(() => {
    switchTemplate(activeTemplate);
  }, [activeTemplate, switchTemplate]);

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
        // Split edge types into batches that each fit within the backend's 20-field limit
        const batches = batchEdgeTypesByFieldLimit(expansion.edgeTypes as EdgeType[], 20);

        const responses = await Promise.all(
          batches.map((batch) =>
            fetchGraphQuery({
              seeds: [{ type: node.type, id: nodeId }],
              steps: [{
                edgeTypes: batch,
                direction: expansion.direction,
                limit: expansion.limit ?? 20,
                sort: expansion.sort,
              }],
              select: { edgeFields: getEdgeFieldsForTypes(batch) },
              limits: { maxNodes: 200, maxEdges: 500 },
            }),
          ),
        );

        // Check if ALL batches failed
        const successResponses = responses.filter((r) => r?.data?.edges?.length);
        if (successResponses.length === 0) {
          actions.dismissExpansionError();
          const allNull = responses.every((r) => r === null);
          toast.error(
            allNull
              ? "Expansion request failed — the server may be unavailable."
              : "No relationships found for this expansion.",
          );
          return;
        }

        // Merge results from all batches
        const newNodes = new Map<string, ExplorerNode>();
        const newEdges = new Map<string, ExplorerEdge>();

        for (const response of successResponses) {
          for (const [, nodeData] of Object.entries(response!.data.nodes)) {
            const entity = nodeData.entity;
            const nodeType = entity.type as EntityType;
            const nodeKey = makeNodeKey(nodeType, entity.id);
            if (!newNodes.has(entity.id)) {
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
          }

          for (const apiEdge of response!.data.edges) {
            const edgeType = apiEdge.type as EdgeType;
            const fromId = parseTypeId(apiEdge.from).id;
            const toId = parseTypeId(apiEdge.to).id;
            const edgeId = createEdgeId(edgeType, fromId, toId);
            if (!newEdges.has(edgeId)) {
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
          }
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

        if (!response) {
          actions.dismissExpansionError();
          toast.error("Expansion request failed — the server may be unavailable.");
          return;
        }

        if (!response.data?.graph) {
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
              pubmedIds: (apiEdge.props?.pmids ?? apiEdge.props?.pubmed_ids) as string[] | undefined,
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

    const trailConfig = VARIANT_TRAIL_CONFIG[node.type];
    if (!trailConfig) return;

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

      for (const route of trailConfig.routes) {
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
          select: { edgeFields: getEdgeFieldsForTypes(allEdgeTypes).slice(0, 20) },
          limits: { maxNodes: trailConfig.maxNodes, maxEdges: trailConfig.maxEdges },
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

  // ==========================================================================
  // Connections Drilldown (fetch ALL relationships for selected edge pair)
  // ==========================================================================

  const edgeSelectionPair = useMemo(() => {
    if (selection.type !== "edge") return { sourceId: null, targetId: null, sourceType: null, targetType: null };
    const sourceNode = selectors.getNode(selection.edge.sourceId);
    const targetNode = selectors.getNode(selection.edge.targetId);
    return {
      sourceId: selection.edge.sourceId,
      targetId: selection.edge.targetId,
      sourceType: sourceNode?.type ?? null,
      targetType: targetNode?.type ?? null,
    };
  }, [selection, selectors]);

  const localEdgesBetween = useMemo(() => {
    if (selection.type !== "edge") return [];
    return selectors.getEdgesBetween(selection.edge.sourceId, selection.edge.targetId);
  }, [selection, selectors]);

  const {
    status: connectionsStatus,
    data: connectionsData,
    error: connectionsError,
    loadMoreEdges,
    retry: retryConnections,
  } = useConnectionsDrilldown({ ...edgeSelectionPair, localEdges: localEdgesBetween });

  const handleFindPaths = useCallback((_fromId: string, _toId: string) => {
    // Path finding will be implemented in a future phase
  }, []);

  const handleClearTrailResult = useCallback(() => {
    setActiveTrailResult(null);
  }, []);

  const handleSelectTrailVariant = useCallback((node: ExplorerNode) => {
    actions.selectNode(node.id, node);
  }, [actions]);

  const handleResultNodeSelect = useCallback((node: ExplorerNode) => {
    actions.selectNode(node.id, node);
  }, [actions]);

  // Selected node ID for list highlighting
  const selectedNodeId = useMemo(() => {
    if (selection.type === "node") return selection.nodeId;
    return undefined;
  }, [selection]);

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
              <span className="text-sm font-medium text-primary">{seed.label}</span>
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
            templates={config.templates}
            activeTemplate={activeTemplate}
            onTemplateChange={switchTemplate}
            edgeTypeGroups={config.edgeTypeGroups}
            onReset={handleReset}
            edgeTypeCounts={edgeTypeCounts}
            nodeTypeCounts={nodeTypeCounts}
            isExpanding={isExpanding}
          />

          {/* Graph Canvas / List / Split */}
          <div className="flex-1 min-w-0 relative flex flex-col">
            {viewMode === "graph" && (
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
              <div className="absolute inset-0 flex flex-col">
                {templateResults ? (
                  <RankedResultsList
                    results={templateResults}
                    onSelectNode={handleResultNodeSelect}
                    selectedNodeId={selectedNodeId}
                    className="flex flex-col h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Switch to a template to see ranked results.
                  </div>
                )}
              </div>
            )}

            {viewMode === "split" && (
              <>
                <div className="flex-1 min-h-0 relative">
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
                </div>
                <div className="h-1/3 border-t border-border bg-background flex flex-col">
                  {templateResults ? (
                    <RankedResultsList
                      results={templateResults}
                      onSelectNode={handleResultNodeSelect}
                      selectedNodeId={selectedNodeId}
                      className="flex flex-col h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      Switch to a template to see ranked results.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* No results for this template */}
            {viewMode !== "list" && graphEdgesSize === 0 && !isExpanding && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center max-w-md">
                  <Network className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Results</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    No relationships found for <strong>{seed.label}</strong> with the current template. Try switching to a different template.
                  </p>
                </div>
              </div>
            )}

            {/* Edge Tooltip (follows cursor on edge hover) */}
            {viewMode !== "list" && <EdgeTooltip info={hoveredEdge} />}
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
                externalLinks={config.externalLinks}
                enableVariantTrail={config.enableVariantTrail}
                onRunVariantTrail={runVariantTrail}
                activeTrailResult={activeTrailResult}
                onClearTrailResult={handleClearTrailResult}
                onSelectTrailVariant={handleSelectTrailVariant}
                connectionsData={connectionsData}
                connectionsStatus={connectionsStatus}
                connectionsError={connectionsError}
                onLoadMoreEdges={loadMoreEdges}
                onRetryConnections={retryConnections}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

export const GraphExplorerView = memo(GraphExplorerViewInner);
