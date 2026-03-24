"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  GitMerge,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { fetchIntersection, type SharedNeighbor } from "../../api";

interface SelectedGene {
  id: string;
  label: string;
}

interface PPISharedInteractorsProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback to close the sheet */
  onOpenChange: (open: boolean) => void;
  /** Selected genes for comparison */
  selectedGenes: SelectedGene[];
  /** Callback to remove a gene from selection */
  onRemoveGene: (geneId: string) => void;
  /** Callback to clear all selections */
  onClearSelection: () => void;
  /** Callback when shared interactors are found */
  onSharedInteractorsFound: (neighborIds: string[]) => void;
  /** Callback to clear shared interactor highlights */
  onClearSharedInteractors: () => void;
  className?: string;
}

function PPISharedInteractorsInner({
  open,
  onOpenChange,
  selectedGenes,
  onRemoveGene,
  onClearSelection,
  onSharedInteractorsFound,
  onClearSharedInteractors,
  className,
}: PPISharedInteractorsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedNeighbors, setSharedNeighbors] = useState<SharedNeighbor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (selectedGenes.length < 2) {
      setError("Please select at least 2 genes to compare");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSharedNeighbors([]);
    onClearSharedInteractors();

    try {
      // Fetch shared interactors using the intersection API
      // NOTE: direction="out" assumes INTERACTS_WITH edges are stored as Gene → Gene
      // For undirected PPI, this works because the API stores edges bidirectionally.
      // If the API changes to store edges unidirectionally, we may need to query
      // both directions or use direction="both" if supported.
      const result = await fetchIntersection(
        selectedGenes.map((g) => ({ type: "Gene", id: g.id })),
        "GENE_INTERACTS_WITH_GENE",
        { direction: "out", limit: 50 }
      );

      if (!result) {
        setError("Failed to fetch shared interactors");
        return;
      }

      setSharedNeighbors(result.data.sharedNeighbors);
      setHasSearched(true);

      // Highlight shared interactors in the graph
      if (result.data.sharedNeighbors.length > 0) {
        const neighborIds = result.data.sharedNeighbors.map((n) => n.neighbor.id);
        onSharedInteractorsFound(neighborIds);
      }
    } catch (err) {
      setError("Failed to search for shared interactors. Please try again.");
      console.error("Intersection search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGenes, onClearSharedInteractors, onSharedInteractorsFound]);

  const handleClearAll = useCallback(() => {
    onClearSelection();
    setSharedNeighbors([]);
    setHasSearched(false);
    setError(null);
    onClearSharedInteractors();
  }, [onClearSelection, onClearSharedInteractors]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn("w-[420px] sm:max-w-[420px]", className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-purple-600" />
            Shared Interactors
          </SheetTitle>
          <SheetDescription>
            Find proteins that interact with all selected genes (potential complex members).
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Selected genes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Selected Genes ({selectedGenes.length})
              </span>
              {selectedGenes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {selectedGenes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedGenes.map((gene) => (
                  <div
                    key={gene.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <span className="text-sm font-medium text-purple-700">
                      {gene.label}
                    </span>
                    <button
                      onClick={() => onRemoveGene(gene.id)}
                      className="p-0.5 hover:bg-purple-200 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-purple-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
                Click nodes in the graph while holding Cmd/Ctrl to select genes
              </div>
            )}
          </div>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={isLoading || selectedGenes.length < 2}
            className="w-full"
            variant={selectedGenes.length < 2 ? "secondary" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Shared Interactors
              </>
            )}
          </Button>

          {selectedGenes.length < 2 && selectedGenes.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Select at least 2 genes to find shared interactors
            </p>
          )}

          {/* Error state */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Results */}
          {hasSearched && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {sharedNeighbors.length} shared interactor{sharedNeighbors.length !== 1 ? "s" : ""} found
                </span>
              </div>

              {sharedNeighbors.length > 0 ? (
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {sharedNeighbors.map((neighbor) => (
                    <div
                      key={neighbor.neighbor.id}
                      className="p-3 rounded-lg border border-border bg-card hover:border-purple-200 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-foreground">
                            {neighbor.neighbor.label}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {neighbor.neighbor.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 rounded text-xs font-medium text-purple-700">
                          {neighbor.support.length} connection{neighbor.support.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Show which genes it connects */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {neighbor.support.map((s, idx) => (
                          <span
                            key={`${s.from.id}-${idx}`}
                            className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded"
                          >
                            {s.from.label}
                          </span>
                        ))}
                      </div>

                      {/* External links */}
                      <div className="mt-2 flex gap-2">
                        <ExternalLink
                          href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(neighbor.neighbor.id)}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Ensembl
                        </ExternalLink>
                        <ExternalLink
                          href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${encodeURIComponent(neighbor.neighbor.label)}`}
                          className="text-xs text-primary hover:underline"
                        >
                          GeneCards
                        </ExternalLink>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <GitMerge className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p>No shared interactors found</p>
                  <p className="text-xs mt-1">
                    These genes may not share common interaction partners
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasSearched && !isLoading && !error && selectedGenes.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <GitMerge className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p>Select genes from the graph to compare</p>
              <p className="text-xs mt-1">
                Hold Cmd/Ctrl and click nodes
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const PPISharedInteractors = memo(PPISharedInteractorsInner);
