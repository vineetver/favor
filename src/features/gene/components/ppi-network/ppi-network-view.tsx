"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { DimensionSelector } from "@shared/components/ui/data-surface/dimension-selector";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import { GitMerge, Route } from "lucide-react";
import { memo, useMemo, useState, useCallback, useEffect } from "react";
import { fetchCentrality, type CentralityResponse, type EntityRef, type SubgraphEdge } from "../../api";
import {
  createEdgeMap,
  extractPPIEdges,
  extractPPIEdgesFromSubgraph,
  transformToCytoscapeElements,
} from "../../utils/ppi-graph-utils";
import { PPICytoscapeGraph } from "./ppi-cytoscape-graph";
import { PPIEdgeDetailPanel } from "./ppi-edge-detail-panel";
import { PPIHubPanel } from "./ppi-hub-panel";
import { PPILegend } from "./ppi-legend";
import { PPINodeTooltip } from "./ppi-node-tooltip";
import { PPIPathFinder } from "./ppi-path-finder";
import { PPISharedInteractors } from "./ppi-shared-interactors";
import {
  COLOR_MODE_OPTIONS,
  LAYOUT_OPTIONS,
  LIMIT_OPTIONS,
  type ActivePanel,
  type CentralityData,
  type CentralityState,
  type ColorMode,
  type LayoutType,
  type PathHighlight,
  type PPIEdge,
  type PPINetworkViewProps,
  type PPINode,
  type Selection,
} from "./types";

// Memoized detail panel to prevent re-renders when hover state changes
interface NodeDetailPanelProps {
  node: PPINode;
}

const NodeDetailPanel = memo(function NodeDetailPanel({ node }: NodeDetailPanelProps) {
  return (
    <div className="border-t border-slate-200">
      <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-100">
        <div className="text-body-sm font-medium text-subtle">
          Selected Node
        </div>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {node.label}
              </span>
              {node.isSeed && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  Seed Gene
                </span>
              )}
            </div>
            <div className="text-xs font-mono text-slate-500">{node.id}</div>
          </div>

          {!node.isSeed && (
            <>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Sources</div>
                <div className="text-sm font-semibold text-slate-900">
                  {node.numSources ?? "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">Experiments</div>
                <div className="text-sm font-semibold text-slate-900">
                  {node.numExperiments ?? "N/A"}
                </div>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-3">
            <ExternalLink
              href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(node.id)}`}
              className="text-sm text-primary hover:underline"
            >
              View on Ensembl
            </ExternalLink>
            <ExternalLink
              href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(node.label)}`}
              className="text-sm text-primary hover:underline"
            >
              View on GeneCards
            </ExternalLink>
          </div>
        </div>
      </div>
    </div>
  );
});

// Memoized graph container to isolate hover state updates
interface GraphContainerProps {
  elements: ReturnType<typeof transformToCytoscapeElements>;
  layout: LayoutType;
  selectedEdgeId: string | null;
  colorMode?: ColorMode;
  centralityData?: Map<string, CentralityData>;
  pathHighlight?: PathHighlight | null;
  selectedGeneIds?: Set<string>;
  sharedInteractorIds?: Set<string>;
  onNodeClick: (node: PPINode) => void;
  onNodeHover: (node: PPINode | null, position: { x: number; y: number } | null) => void;
  onEdgeClick: (edgeId: string, position: { x: number; y: number }) => void;
}

const GraphContainer = memo(function GraphContainer({
  elements,
  layout,
  selectedEdgeId,
  colorMode,
  centralityData,
  pathHighlight,
  selectedGeneIds,
  sharedInteractorIds,
  onNodeClick,
  onNodeHover,
  onEdgeClick,
}: GraphContainerProps) {
  return (
    <div className="relative h-[600px] bg-slate-50/30">
      <PPICytoscapeGraph
        elements={elements}
        layout={layout}
        selectedEdgeId={selectedEdgeId}
        colorMode={colorMode}
        centralityData={centralityData}
        pathHighlight={pathHighlight}
        selectedGeneIds={selectedGeneIds}
        sharedInteractorIds={sharedInteractorIds}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
        onEdgeClick={onEdgeClick}
      />
      <PPILegend colorMode={colorMode} />
      {/* Hint for interactions */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm px-3 py-2">
        <div className="text-xs text-slate-500 space-y-1">
          <div>Click an edge to explain the interaction</div>
          <div>Cmd/Ctrl+click nodes to compare</div>
        </div>
      </div>
    </div>
  );
});

export function PPINetworkView({
  seedGeneId,
  seedGeneSymbol,
  subgraphNodes,
  subgraphEdges,
  edges,
  relations,
  className,
}: PPINetworkViewProps) {
  const [limit, setLimit] = useState("25");
  const [layout, setLayout] = useState<LayoutType>("cose-bilkent");
  const [hoveredNode, setHoveredNode] = useState<PPINode | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Selection state - discriminated union: only one selection type at a time
  const [selection, setSelection] = useState<Selection>({ type: "none" });

  // Hub Spotlight state - discriminated union for fetch state
  const [colorMode, setColorMode] = useState<ColorMode>("confidence");
  const [centralityState, setCentralityState] = useState<CentralityState>({ status: "idle" });

  // Derive topHubs from centrality data (was stored, now computed)
  const topHubs = useMemo(() => {
    if (centralityState.status !== "loaded") return [];
    return Array.from(centralityState.data.values())
      .filter((data) => data.entity.id !== seedGeneId) // Exclude seed from top hubs list
      .sort((a, b) => b.hubScore - a.hubScore)
      .slice(0, 5);
  }, [centralityState, seedGeneId]);

  // Path Discovery state
  const [pathHighlight, setPathHighlight] = useState<PathHighlight | null>(null);

  // Panel state - only one panel can be open at a time
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");

  // Shared Interactors state
  const [selectedGeneIds, setSelectedGeneIds] = useState<Set<string>>(new Set());
  const [sharedInteractorIds, setSharedInteractorIds] = useState<Set<string>>(new Set());

  // Extract and limit PPI edges - memoized with stable dependencies
  // Prefer subgraph data (EntityRef format) when available, fall back to legacy format
  const allEdges = useMemo(() => {
    if (subgraphNodes && subgraphEdges && subgraphEdges.length > 0) {
      return extractPPIEdgesFromSubgraph(seedGeneId, subgraphNodes, subgraphEdges);
    }
    return extractPPIEdges(seedGeneId, seedGeneSymbol, relations, edges);
  }, [seedGeneId, seedGeneSymbol, subgraphNodes, subgraphEdges, relations, edges]);

  const limitedEdges = useMemo(() => {
    const limitNum = parseInt(limit, 10);
    return allEdges.slice(0, limitNum);
  }, [allEdges, limit]);

  // Create edge map for quick lookup
  const edgeMap = useMemo(() => createEdgeMap(limitedEdges), [limitedEdges]);

  // Get selected edge data (derived from selection state)
  const selectedEdge = useMemo<PPIEdge | null>(() => {
    if (selection.type !== "edge") return null;
    return edgeMap.get(selection.edgeId) ?? null;
  }, [selection, edgeMap]);

  // Get selected node (derived from selection state)
  const selectedNode = selection.type === "node" ? selection.node : null;

  // Get selected edge ID for graph highlighting
  const selectedEdgeId = selection.type === "edge" ? selection.edgeId : null;

  // Get centrality data for the graph (derived from centrality state)
  const centralityData = centralityState.status === "loaded" ? centralityState.data : undefined;
  const seedCentrality = centralityState.status === "loaded" ? centralityState.seedCentrality : null;
  const isLoadingCentrality = centralityState.status === "loading";

  // Transform to Cytoscape elements - memoized
  const elements = useMemo(
    () =>
      transformToCytoscapeElements(
        { id: seedGeneId, symbol: seedGeneSymbol },
        limitedEdges,
      ),
    [seedGeneId, seedGeneSymbol, limitedEdges],
  );

  // Build selected genes list for Shared Interactors panel
  // Uses a Set to prevent duplicates (genes can appear in multiple edges)
  const selectedGenesList = useMemo(() => {
    const genes: Array<{ id: string; label: string }> = [];
    const addedIds = new Set<string>();

    // Add seed gene if selected
    if (selectedGeneIds.has(seedGeneId)) {
      genes.push({ id: seedGeneId, label: seedGeneSymbol });
      addedIds.add(seedGeneId);
    }

    // Add other selected genes from edges (check both source and target)
    limitedEdges.forEach((edge) => {
      // Check source (could be a neighbor in cross-connections)
      if (selectedGeneIds.has(edge.sourceId) && !addedIds.has(edge.sourceId)) {
        genes.push({ id: edge.sourceId, label: edge.sourceSymbol });
        addedIds.add(edge.sourceId);
      }
      // Check target
      if (selectedGeneIds.has(edge.targetId) && !addedIds.has(edge.targetId)) {
        genes.push({ id: edge.targetId, label: edge.targetSymbol });
        addedIds.add(edge.targetId);
      }
    });

    return genes;
  }, [selectedGeneIds, seedGeneId, seedGeneSymbol, limitedEdges]);

  // Fetch centrality data for seed gene and neighbors
  useEffect(() => {
    if (colorMode !== "hub") {
      // Reset to idle when not in hub mode
      setCentralityState({ status: "idle" });
      return;
    }

    const fetchCentralityData = async () => {
      setCentralityState({ status: "loading" });

      try {
        // Fetch seed gene centrality
        const seedResult = await fetchCentrality("Gene", seedGeneId);

        // Fetch centrality for visible neighbors (limited edges)
        const neighborIds = limitedEdges.map((e) => e.targetId);
        const centralityMap = new Map<string, CentralityData>();

        // Fetch in batches to avoid too many concurrent requests
        const batchSize = 10;
        for (let i = 0; i < neighborIds.length; i += batchSize) {
          const batch = neighborIds.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((id) => fetchCentrality("Gene", id))
          );

          results.forEach((result, idx) => {
            if (result?.data) {
              centralityMap.set(batch[idx], result.data);
            }
          });
        }

        // Add seed to centrality map
        if (seedResult?.data) {
          centralityMap.set(seedGeneId, seedResult.data);
        }

        setCentralityState({
          status: "loaded",
          data: centralityMap,
          seedCentrality: seedResult?.data ?? null,
        });
      } catch (error) {
        console.error("Failed to fetch centrality data:", error);
        setCentralityState({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to fetch centrality data",
        });
      }
    };

    fetchCentralityData();
  }, [colorMode, seedGeneId, limitedEdges]);

  // Stable layout change handler
  const handleLayoutChange = useCallback((value: string) => {
    setLayout(value as LayoutType);
  }, []);

  // Stable color mode change handler
  const handleColorModeChange = useCallback((value: string) => {
    setColorMode(value as ColorMode);
  }, []);

  // Dimension controls - memoized with stable callbacks
  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Limit",
        value: limit,
        onChange: setLimit,
        options: LIMIT_OPTIONS,
        presentation: "segmented",
      },
      {
        label: "Layout",
        value: layout,
        onChange: handleLayoutChange,
        options: LAYOUT_OPTIONS,
        presentation: "dropdown",
      },
      {
        label: "Color by",
        value: colorMode,
        onChange: handleColorModeChange,
        options: COLOR_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        presentation: "dropdown",
      },
    ],
    [limit, layout, colorMode, handleLayoutChange, handleColorModeChange],
  );

  // Stable event handlers
  const handleNodeClick = useCallback((node: PPINode, event?: MouseEvent) => {
    // Check if Cmd/Ctrl is held for multi-select mode
    const isMultiSelect = event?.metaKey || event?.ctrlKey;

    if (isMultiSelect) {
      setSelectedGeneIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
      // Don't change selection state in multi-select mode
    } else {
      setSelection({ type: "node", node });
    }
  }, []);

  const handleNodeHover = useCallback(
    (node: PPINode | null, position: { x: number; y: number } | null) => {
      setHoveredNode(node);
      setHoverPosition(position);
    },
    [],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, _position: { x: number; y: number }) => {
      setSelection({ type: "edge", edgeId });
    },
    [],
  );

  const handleCloseEdgePanel = useCallback(() => {
    setSelection({ type: "none" });
  }, []);

  // Hub panel handlers
  const handleHubClick = useCallback((geneId: string) => {
    // Find the node in the graph and select it
    const edge = limitedEdges.find((e) => e.targetId === geneId);
    if (edge) {
      setSelection({
        type: "node",
        node: {
          id: edge.targetId,
          label: edge.targetSymbol,
          isSeed: false,
          numSources: edge.numSources,
          numExperiments: edge.numExperiments,
          confidenceScores: edge.confidenceScores,
        },
      });
    }
  }, [limitedEdges]);

  // Path finder handlers
  const handlePathHighlight = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setPathHighlight({
      nodeIds: new Set(nodeIds),
      edgeIds: new Set(edgeIds),
    });
  }, []);

  const handleClearPath = useCallback(() => {
    setPathHighlight(null);
  }, []);

  // Shared interactors handlers
  const handleRemoveGene = useCallback((geneId: string) => {
    setSelectedGeneIds((prev) => {
      const next = new Set(prev);
      next.delete(geneId);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedGeneIds(new Set());
  }, []);

  const handleSharedInteractorsFound = useCallback((neighborIds: string[]) => {
    setSharedInteractorIds(new Set(neighborIds));
  }, []);

  const handleClearSharedInteractors = useCallback(() => {
    setSharedInteractorIds(new Set());
  }, []);

  // No data state
  if (!allEdges.length) {
    return (
      <NoDataState
        categoryName="Protein-Protein Interactions"
        description="No protein-protein interactions are available for this gene."
      />
    );
  }

  return (
    <>
      <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
        <CardHeader className="border-b border-slate-200 px-6 py-5">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Protein-Protein Interactions
            </CardTitle>
            <div className="text-sm text-slate-500">
              {allEdges.length} interactions for {seedGeneSymbol}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-4">
              {dimensions.map((dim, index) => (
                <div key={`${dim.label}-${index}`} className="flex items-center gap-4">
                  {index > 0 && <div className="h-5 w-px bg-slate-200" />}
                  <DimensionSelector
                    label={dim.label}
                    options={dim.options}
                    value={dim.value}
                    onChange={dim.onChange}
                    presentation={dim.presentation}
                  />
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivePanel("pathFinder")}
                className="h-8"
              >
                <Route className="w-4 h-4 mr-1.5" />
                Find Path
              </Button>
              <Button
                variant={selectedGeneIds.size > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setActivePanel("sharedInteractors")}
                className="h-8"
              >
                <GitMerge className="w-4 h-4 mr-1.5" />
                Compare
                {selectedGeneIds.size > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {selectedGeneIds.size}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Graph Container - isolated from hover state */}
          <GraphContainer
            elements={elements}
            layout={layout}
            selectedEdgeId={selectedEdgeId}
            colorMode={colorMode}
            centralityData={centralityData}
            pathHighlight={pathHighlight}
            selectedGeneIds={selectedGeneIds}
            sharedInteractorIds={sharedInteractorIds}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onEdgeClick={handleEdgeClick}
          />

          {/* Edge Detail Panel - "Explain this edge" */}
          {selectedEdge && (
            <PPIEdgeDetailPanel
              edge={selectedEdge}
              onClose={handleCloseEdgePanel}
            />
          )}

          {/* Node Detail Panel - shown when no edge selected */}
          {selectedNode && !selectedEdge && <NodeDetailPanel node={selectedNode} />}

          {/* Hub Analysis Panel - shown in hub color mode */}
          {colorMode === "hub" && (
            <PPIHubPanel
              seedCentrality={seedCentrality}
              topHubs={topHubs}
              isLoading={isLoadingCentrality}
              onHubClick={handleHubClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Tooltip - only re-renders when hover state changes */}
      <PPINodeTooltip node={hoveredNode} position={hoverPosition} />

      {/* Path Finder Sheet */}
      <PPIPathFinder
        open={activePanel === "pathFinder"}
        onOpenChange={(open) => setActivePanel(open ? "pathFinder" : "none")}
        seedGeneId={seedGeneId}
        seedGeneSymbol={seedGeneSymbol}
        onPathHighlight={handlePathHighlight}
        onClearPath={handleClearPath}
      />

      {/* Shared Interactors Sheet */}
      <PPISharedInteractors
        open={activePanel === "sharedInteractors"}
        onOpenChange={(open) => setActivePanel(open ? "sharedInteractors" : "none")}
        selectedGenes={selectedGenesList}
        onRemoveGene={handleRemoveGene}
        onClearSelection={handleClearSelection}
        onSharedInteractorsFound={handleSharedInteractorsFound}
        onClearSharedInteractors={handleClearSharedInteractors}
      />
    </>
  );
}
