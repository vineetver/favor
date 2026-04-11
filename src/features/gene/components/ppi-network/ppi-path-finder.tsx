"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { ArrowRight, Loader2, Route, Search, X } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { fetchPaths, type PathResult } from "../../api";
import { PathRecipeSelector } from "./path-recipe-selector";
import { PATH_RECIPES, type PathRecipe } from "./types";

interface PPIPathFinderProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback to close the sheet */
  onOpenChange: (open: boolean) => void;
  /** Seed gene ID to search from */
  seedGeneId: string;
  /** Seed gene symbol for display */
  seedGeneSymbol: string;
  /** Callback when a path is found and should be highlighted */
  onPathHighlight: (nodeIds: string[], edgeIds: string[]) => void;
  /** Callback to clear path highlight */
  onClearPath: () => void;
  className?: string;
}

function PPIPathFinderInner({
  open,
  onOpenChange,
  seedGeneId,
  seedGeneSymbol,
  onPathHighlight,
  onClearPath,
  className,
}: PPIPathFinderProps) {
  const [targetGene, setTargetGene] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(
    null,
  );
  const [recipe, setRecipe] = useState<PathRecipe>("ppi-only");

  const handleSearch = useCallback(async () => {
    if (!targetGene.trim()) {
      setError("Please enter a target gene");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPaths([]);
    setSelectedPathIndex(null);
    onClearPath();

    try {
      const recipeConfig = PATH_RECIPES[recipe];
      // Therapeutic paths are longer: Gene ← Drug → Disease ← Drug → Gene (4 hops)
      // Mechanism paths: Gene → Pathway → Gene or Gene → Pathway ← Pathway ← Gene (2-4 hops)
      const maxHops =
        recipe === "ppi-only" ? 3 : recipe === "therapeutic" ? 5 : 4;
      const result = await fetchPaths(
        `Gene:${seedGeneId}`,
        `Gene:${targetGene.trim().toUpperCase()}`,
        {
          maxHops,
          limit: 5,
          edgeTypes: recipeConfig.edgeTypes,
        },
      );

      if (!result || !result.data.paths.length) {
        setError(`No path found between ${seedGeneSymbol} and ${targetGene}`);
        return;
      }

      setPaths(result.data.paths);
    } catch (err) {
      setError("Failed to search for paths. Please try again.");
      console.error("Path search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [targetGene, seedGeneId, seedGeneSymbol, onClearPath, recipe]);

  const handleHighlightPath = useCallback(
    (path: PathResult, index: number) => {
      const nodeIds = path.nodes.map((n) => n.id);

      // Generate edge IDs based on recipe type
      // For PPI-only: use ppi-{from}-{to} format (bidirectional)
      // For other recipes: edges may not exist in PPI graph, only highlight Gene nodes
      //
      // Non-PPI edges won't exist in the PPI graph which only contains
      // GENE_INTERACTS_WITH_GENE edges. For non-PPI recipes, we highlight
      // Gene nodes in the path; intermediate nodes may not be visible.
      const edgeIds: string[] = [];

      if (recipe === "ppi-only") {
        // PPI edges are bidirectional - generate both directions
        for (const edge of path.edges) {
          edgeIds.push(`ppi-${edge.from.id}-${edge.to.id}`);
          edgeIds.push(`ppi-${edge.to.id}-${edge.from.id}`);
        }
      } else {
        // For non-PPI recipes, only try to match edges where both nodes are Genes
        // Match Gene↔Gene edges that may exist in the PPI graph
        for (const edge of path.edges) {
          if (edge.from.type === "Gene" && edge.to.type === "Gene") {
            edgeIds.push(`ppi-${edge.from.id}-${edge.to.id}`);
            edgeIds.push(`ppi-${edge.to.id}-${edge.from.id}`);
          }
        }
      }

      onPathHighlight(nodeIds, edgeIds);
      setSelectedPathIndex(index);
    },
    [onPathHighlight, recipe],
  );

  const handleClearPath = useCallback(() => {
    onClearPath();
    setSelectedPathIndex(null);
  }, [onClearPath]);

  const _handleClose = useCallback(() => {
    onOpenChange(false);
    // Don't clear paths/selection on close, keep the highlight
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("w-[400px] sm:max-w-[400px]", className)}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-600" />
            Find Interaction Path
          </SheetTitle>
          <SheetDescription>
            Discover the shortest protein-protein interaction path between{" "}
            <span className="font-semibold text-indigo-600">
              {seedGeneSymbol}
            </span>{" "}
            and another gene.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Path Recipe Selector */}
          <PathRecipeSelector value={recipe} onChange={setRecipe} />

          {/* Search input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                <span className="font-semibold text-indigo-600">
                  {seedGeneSymbol}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <Input
                  placeholder="Enter gene symbol (e.g., TP53)"
                  value={targetGene}
                  onChange={(e) => setTargetGene(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={isLoading || !targetGene.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Path
                </>
              )}
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {paths.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {paths.length} path{paths.length !== 1 ? "s" : ""} found
                </span>
                {selectedPathIndex !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPath}
                    className="h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear highlight
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {paths.map((path, index) => (
                  <button
                    key={`path-${index}`}
                    onClick={() => handleHighlightPath(path, index)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedPathIndex === index
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                        : "border-border bg-card hover:border-border hover:bg-accent",
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Path {index + 1}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          path.length <= 2
                            ? "bg-green-100 text-green-700"
                            : path.length === 3
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-orange-100 text-orange-700",
                        )}
                      >
                        {path.length} hop{path.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Visual path */}
                    <div className="flex flex-wrap items-center gap-1">
                      {path.nodes.map((node, nodeIndex) => {
                        // Color by node type, with special colors for start/end genes
                        const isStart = nodeIndex === 0;
                        const isEnd = nodeIndex === path.nodes.length - 1;
                        const nodeStyle = isStart
                          ? "bg-indigo-100 text-indigo-700"
                          : isEnd
                            ? "bg-emerald-100 text-emerald-700"
                            : node.type === "Drug"
                              ? "bg-purple-100 text-purple-700"
                              : node.type === "Disease"
                                ? "bg-rose-100 text-rose-700"
                                : node.type === "Pathway"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted text-foreground";

                        return (
                          <span
                            key={`${nodeIndex}-${node.id}`}
                            className="flex items-center gap-1"
                          >
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                nodeStyle,
                              )}
                              title={`${node.type}: ${node.label}`}
                            >
                              {node.label}
                            </span>
                            {nodeIndex < path.nodes.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && paths.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Route className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p>Enter a target gene to find interaction paths</p>
              <p className="text-xs mt-1">
                Maximum{" "}
                {recipe === "ppi-only" ? 3 : recipe === "therapeutic" ? 5 : 4}{" "}
                hops
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const PPIPathFinder = memo(PPIPathFinderInner);
