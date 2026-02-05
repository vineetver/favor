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
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Download, List, Network } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { buildCytoscapeElements } from "../../utils/pathway-graph-utils";
import { PathwayCytoscapeGraph } from "./pathway-cytoscape-graph";
import { PathwayLegend } from "./pathway-legend";
import { PathwayListPanel } from "./pathway-list-panel";
import { PathwayNodeTooltip } from "./pathway-node-tooltip";
import {
  type GraphNode,
  getCategoryColor,
  PATHWAY_LAYOUT_OPTIONS,
  type PathwayLayoutType,
  type PathwayLeverageViewProps,
  type PathwayNode,
} from "./types";

// =============================================================================
// View State - Discriminated Union (no boolean soup)
// =============================================================================

type ViewMode = "graph" | "list";

// =============================================================================
// Selected Pathway Detail
// =============================================================================

const SelectedPathwayDetail = memo(function SelectedPathwayDetail({
  pathway,
  onClose,
}: {
  pathway: PathwayNode;
  onClose: () => void;
}) {
  const colors = getCategoryColor(pathway.category);

  return (
    <div className="border-t border-slate-200 bg-slate-50">
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: colors.border }}
              />
              <h3 className="font-semibold text-slate-900 truncate">
                {pathway.name}
              </h3>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded shrink-0">
                {pathway.source === "reactome" ? "Reactome" : "WikiPathways"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 pl-6">
              <span className="font-mono">{pathway.id}</span>
              <span>•</span>
              <span>{pathway.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExternalLink
              href={pathway.url}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              View on{" "}
              {pathway.source === "reactome" ? "Reactome" : "WikiPathways"} →
            </ExternalLink>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
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

  // Selection state
  const [selectedPathway, setSelectedPathway] = useState<PathwayNode | null>(
    null,
  );
  const [hoveredPathway, setHoveredPathway] = useState<PathwayNode | null>(
    null,
  );
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Build cytoscape elements
  const elements = useMemo(
    () =>
      buildCytoscapeElements(
        { id: seedGeneId, symbol: seedGeneSymbol },
        pathways,
        hierarchyEdges,
      ),
    [seedGeneId, seedGeneSymbol, pathways, hierarchyEdges],
  );

  // Handlers
  const handleLayoutChange = useCallback((value: string) => {
    setLayout(value as PathwayLayoutType);
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "pathway") {
      setSelectedPathway(node.data);
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
    setSelectedPathway(pathway);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPathway(null);
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
              {pathways.length} pathways involving {seedGeneSymbol}
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
            {viewMode === "graph" && (
              <DimensionSelector
                label="Layout"
                options={PATHWAY_LAYOUT_OPTIONS}
                value={layout}
                onChange={handleLayoutChange}
                presentation="dropdown"
              />
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>

        {/* Main content */}
        {viewMode === "graph" ? (
          <div className="relative h-[600px] bg-slate-50/30">
            <PathwayCytoscapeGraph
              elements={elements}
              layout={layout}
              selectedNodeId={selectedPathway?.id ?? null}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
            />
            <PathwayLegend />
            {/* Instructions */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm px-3 py-2">
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>Click pathway to see details</div>
                <div>Scroll to zoom • Drag to pan</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[600px]">
            <PathwayListPanel
              pathways={pathways}
              selectedPathwayId={selectedPathway?.id ?? null}
              onPathwayClick={handlePathwayClick}
            />
          </div>
        )}

        {/* Selected pathway detail */}
        {selectedPathway && (
          <SelectedPathwayDetail
            pathway={selectedPathway}
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
