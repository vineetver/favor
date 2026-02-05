"use client";

import { fetchPathwayEnrichment } from "@features/gene/api";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { DimensionSelector } from "@shared/components/ui/data-surface/dimension-selector";
import { NoDataState } from "@shared/components/ui/error-states";
import { Download, List, Network } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { buildCytoscapeElements } from "../../utils/pathway-graph-utils";
import { PathwayCategorySidebar } from "./pathway-category-sidebar";
import { PathwayCytoscapeGraph } from "./pathway-cytoscape-graph";
import { PathwayDetailPanel } from "./pathway-detail-panel";
import { PathwayLegend } from "./pathway-legend";
import { PathwayListPanel } from "./pathway-list-panel";
import { PathwayNodeTooltip } from "./pathway-node-tooltip";
import {
  type CategoryFilterState,
  type EnrichmentState,
  type GraphNode,
  groupPathwaysByCategory,
  PATHWAY_LAYOUT_OPTIONS,
  type PathwayLayoutType,
  PATHWAY_LIMIT_OPTIONS,
  type PathwayLeverageViewProps,
  type PathwayNode,
  type PathwaySelection,
} from "./types";

// =============================================================================
// View State - Discriminated Union (no boolean soup)
// =============================================================================

type ViewMode = "graph" | "list";

// =============================================================================
// Memoized Graph Container - isolates graph from hover state updates
// =============================================================================

interface GraphContainerProps {
  elements: ReturnType<typeof buildCytoscapeElements>;
  layout: PathwayLayoutType;
  selectedNodeId: string | null;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (
    node: PathwayNode | null,
    position: { x: number; y: number } | null
  ) => void;
}

const GraphContainer = memo(function GraphContainer({
  elements,
  layout,
  selectedNodeId,
  onNodeClick,
  onNodeHover,
}: GraphContainerProps) {
  return (
    <div className="relative h-[600px] bg-slate-50/30">
      <PathwayCytoscapeGraph
        elements={elements}
        layout={layout}
        selectedNodeId={selectedNodeId}
        onNodeClick={onNodeClick}
        onNodeHover={onNodeHover}
      />
      <PathwayLegend />
      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm px-3 py-2">
        <div className="text-xs text-slate-500 space-y-0.5">
          <div>Click pathway to see details</div>
          <div>Scroll to zoom - Drag to pan</div>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

function PathwayLeverageViewInner({
  seedGeneId,
  seedGeneSymbol,
  pathways,
  hierarchyEdges,
}: PathwayLeverageViewProps) {
  // View state - graph first
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [layout, setLayout] = useState<PathwayLayoutType>("cose-bilkent");
  const [limit, setLimit] = useState("50");

  // Selection state - discriminated union
  const [selection, setSelection] = useState<PathwaySelection>({ type: "none" });

  // Hover state
  const [hoveredPathway, setHoveredPathway] = useState<PathwayNode | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Filter state
  const [filterState, setFilterState] = useState<CategoryFilterState>({
    selectedCategories: new Set(),
    showHierarchy: true,
  });

  // Enrichment state (lazy loaded)
  const [enrichment, setEnrichment] = useState<EnrichmentState>({
    status: "idle",
  });

  // Apply limit to pathways
  const limitedPathways = useMemo(() => {
    if (limit === "all") return pathways;
    const limitNum = parseInt(limit, 10);
    return pathways.slice(0, limitNum);
  }, [pathways, limit]);

  // Group pathways by category for sidebar (uses limited pathways)
  const categories = useMemo(
    () => groupPathwaysByCategory(limitedPathways),
    [limitedPathways],
  );

  // Build cytoscape elements with filter state (uses limited pathways)
  const elements = useMemo(
    () =>
      buildCytoscapeElements(
        { id: seedGeneId, symbol: seedGeneSymbol },
        limitedPathways,
        hierarchyEdges,
        { filterState },
      ),
    [seedGeneId, seedGeneSymbol, limitedPathways, hierarchyEdges, filterState],
  );

  // Lazy enrichment fetch when pathway is selected
  useEffect(() => {
    if (selection.type !== "pathway") {
      setEnrichment({ status: "idle" });
      return;
    }

    const pathwayId = selection.pathway.id;
    setEnrichment({ status: "loading", pathwayId });

    fetchPathwayEnrichment(pathwayId, seedGeneId)
      .then((data) => {
        if (data) {
          setEnrichment({ status: "loaded", pathwayId, data });
        } else {
          setEnrichment({
            status: "error",
            pathwayId,
            error: "Failed to fetch enrichment data",
          });
        }
      })
      .catch((err) => {
        setEnrichment({
          status: "error",
          pathwayId,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
  }, [selection, seedGeneId]);

  // Handlers
  const handleLayoutChange = useCallback((value: string) => {
    setLayout(value as PathwayLayoutType);
  }, []);

  const handleLimitChange = useCallback((value: string) => {
    setLimit(value);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "pathway") {
      setSelection({ type: "pathway", pathway: node.data });
    }
  }, []);

  const handleNodeHover = useCallback(
    (node: PathwayNode | null, position: { x: number; y: number } | null) => {
      setHoveredPathway(node);
      setHoverPosition(position);
    },
    [],
  );

  const handlePathwayClick = useCallback((pathway: PathwayNode) => {
    setSelection({ type: "pathway", pathway });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelection({ type: "none" });
  }, []);

  const handleFilterChange = useCallback((newState: CategoryFilterState) => {
    setFilterState(newState);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ["Pathway ID", "Name", "Category", "Source", "URL"];
    const rows = pathways.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.source,
      p.url,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${seedGeneSymbol}_pathways.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pathways, seedGeneSymbol]);

  // No data
  if (pathways.length === 0) {
    return (
      <NoDataState
        categoryName="Pathway Data"
        description="No pathway annotations are available for this gene."
      />
    );
  }

  // Get selected pathway ID for highlight
  const selectedPathwayId =
    selection.type === "pathway" ? selection.pathway.id : null;

  // Filter pathways by category (limit already applied via limitedPathways)
  const filteredPathways = useMemo(() => {
    if (filterState.selectedCategories.size === 0) {
      return limitedPathways;
    }
    return limitedPathways.filter(
      (p) => !filterState.selectedCategories.has(p.category),
    );
  }, [limitedPathways, filterState.selectedCategories]);

  return (
    <Card className={cn("border border-slate-200 py-0 gap-0")}>
      {/* Header */}
      <CardHeader className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Pathway Map
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              {filteredPathways.length} of {pathways.length} pathways involving{" "}
              {seedGeneSymbol}
              {limit !== "all" && limitedPathways.length < pathways.length && (
                <span className="text-slate-400">
                  {" "}(showing {limitedPathways.length})
                </span>
              )}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "graph"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <Network className="w-4 h-4" />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Controls bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <DimensionSelector
              label="Limit"
              options={PATHWAY_LIMIT_OPTIONS}
              value={limit}
              onChange={handleLimitChange}
              presentation="segmented"
            />
            {viewMode === "graph" && (
              <>
                <div className="h-5 w-px bg-slate-200" />
                <DimensionSelector
                  label="Layout"
                  options={PATHWAY_LAYOUT_OPTIONS}
                  value={layout}
                  onChange={handleLayoutChange}
                  presentation="dropdown"
                />
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>

        {/* Main content with sidebar */}
        <div className="flex">
          {/* Sidebar */}
          <PathwayCategorySidebar
            categories={categories}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            className="w-56 border-r border-slate-200 shrink-0 h-[600px]"
          />

          {/* Graph/List content */}
          <div className="flex-1 min-w-0">
            {viewMode === "graph" ? (
              <GraphContainer
                elements={elements}
                layout={layout}
                selectedNodeId={selectedPathwayId}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
              />
            ) : (
              <div className="h-[600px]">
                <PathwayListPanel
                  pathways={filteredPathways}
                  selectedPathwayId={selectedPathwayId}
                  onPathwayClick={handlePathwayClick}
                />
              </div>
            )}
          </div>
        </div>

        {/* Detail panel at bottom */}
        {selection.type === "pathway" && (
          <PathwayDetailPanel
            pathway={selection.pathway}
            enrichment={enrichment}
            seedGeneSymbol={seedGeneSymbol}
            onClose={handleClearSelection}
          />
        )}
      </CardContent>

      {/* Tooltip (only in graph view) */}
      {viewMode === "graph" && (
        <PathwayNodeTooltip node={hoveredPathway} position={hoverPosition} />
      )}
    </Card>
  );
}

export const PathwayLeverageView = memo(PathwayLeverageViewInner);
