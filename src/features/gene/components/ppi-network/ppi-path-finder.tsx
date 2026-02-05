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
import {
  ArrowRight,
  Loader2,
  Route,
  Search,
  X,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { fetchPaths, type PathResult } from "../../api";

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
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);

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
      const result = await fetchPaths(
        `Gene:${seedGeneId}`,
        `Gene:${targetGene.trim().toUpperCase()}`,
        {
          maxHops: 3,
          limit: 5,
          edgeTypes: ["INTERACTS_WITH"],
        }
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
  }, [targetGene, seedGeneId, seedGeneSymbol, onClearPath]);

  const handleHighlightPath = useCallback(
    (path: PathResult, index: number) => {
      const nodeIds = path.nodes.map((n) => n.id);
      // Generate edge IDs in the format used by the graph
      const edgeIds = path.edges.map((e) => `ppi-${e.from.id}-${e.to.id}`);
      // Also include reverse edges since PPI is undirected
      const reverseEdgeIds = path.edges.map((e) => `ppi-${e.to.id}-${e.from.id}`);

      onPathHighlight(nodeIds, [...edgeIds, ...reverseEdgeIds]);
      setSelectedPathIndex(index);
    },
    [onPathHighlight]
  );

  const handleClearPath = useCallback(() => {
    onClearPath();
    setSelectedPathIndex(null);
  }, [onClearPath]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Don't clear paths/selection on close, keep the highlight
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-[400px] sm:max-w-[400px]", className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-600" />
            Find Interaction Path
          </SheetTitle>
          <SheetDescription>
            Discover the shortest protein-protein interaction path between{" "}
            <span className="font-semibold text-indigo-600">{seedGeneSymbol}</span> and
            another gene.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg">
                <span className="font-semibold text-indigo-600">{seedGeneSymbol}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
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
                <span className="text-sm font-medium text-slate-700">
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
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">
                        Path {index + 1}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          path.length <= 2
                            ? "bg-green-100 text-green-700"
                            : path.length === 3
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-orange-100 text-orange-700"
                        )}
                      >
                        {path.length} hop{path.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Visual path */}
                    <div className="flex flex-wrap items-center gap-1">
                      {path.nodes.map((node, nodeIndex) => (
                        <span key={node.id} className="flex items-center gap-1">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              nodeIndex === 0
                                ? "bg-indigo-100 text-indigo-700"
                                : nodeIndex === path.nodes.length - 1
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                            )}
                          >
                            {node.label}
                          </span>
                          {nodeIndex < path.nodes.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && paths.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-500">
              <Route className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Enter a target gene to find interaction paths</p>
              <p className="text-xs mt-1">Maximum 3 hops</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const PPIPathFinder = memo(PPIPathFinderInner);
