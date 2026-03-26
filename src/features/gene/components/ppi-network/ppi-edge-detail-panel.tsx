"use client";

import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  Database,
  FileText,
  FlaskConical,
} from "lucide-react";
import { memo } from "react";
import { formatConfidenceScore } from "../../utils/ppi-graph-utils";
import type { PPIEdge } from "./types";

interface PPIEdgeDetailPanelProps {
  edge: PPIEdge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PPIEdgeDetailPanelInner({ edge, open, onOpenChange }: PPIEdgeDetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
        {edge && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-lg">
                <span className="font-semibold text-indigo-600">{edge.sourceSymbol}</span>
                <span className="text-muted-foreground">⟷</span>
                <span className="font-semibold text-foreground">{edge.targetSymbol}</span>
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 pt-6">
              {/* Type + Confidence class */}
              <div className="flex flex-wrap items-center gap-2">
                {edge._interactionType && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground capitalize">
                    {edge._interactionType.replace(/_/g, " ")}
                  </span>
                )}
                {edge._confidenceClass && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground capitalize">
                    {edge._confidenceClass.replace(/_/g, " ")} confidence
                  </span>
                )}
              </div>

              {/* Evidence stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="w-3.5 h-3.5" />
                    Sources
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {edge.numSources ?? "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Evidence
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {edge.numExperiments ?? "—"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    Publications
                  </div>
                  <div className="text-xl font-semibold text-foreground">
                    {edge.pubmedIds?.length || "—"}
                  </div>
                </div>
              </div>

              {/* Confidence scores */}
              {edge.confidenceScores.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Confidence Scores
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-foreground">
                      Average: <span className="font-semibold">{formatConfidenceScore(edge.confidenceScores)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({edge.confidenceScores.length} score{edge.confidenceScores.length !== 1 ? "s" : ""})
                    </div>
                  </div>
                </div>
              )}

              {/* Sources list */}
              {edge.sources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Supporting Databases
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {edge.sources.map((source, idx) => (
                      <span
                        key={`${source.name}-${idx}`}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground"
                      >
                        {source.name}
                        {source.experimentCount !== undefined && (
                          <span className="ml-1.5 text-muted-foreground">
                            ({source.experimentCount})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detection methods */}
              {edge.detectionMethods && edge.detectionMethods.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Detection Methods
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {edge.detectionMethods.slice(0, 5).map((method, idx) => (
                      <span
                        key={`${method}-${idx}`}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-xs text-blue-700"
                      >
                        {method}
                      </span>
                    ))}
                    {edge.detectionMethods.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{edge.detectionMethods.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Publications */}
              {edge.pubmedIds && edge.pubmedIds.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Key Publications
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {edge.pubmedIds.slice(0, 5).map((pmid) => (
                      <ExternalLink
                        key={pmid}
                        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        PMID:{pmid}
                      </ExternalLink>
                    ))}
                    {edge.pubmedIds.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{edge.pubmedIds.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* External links */}
              <div className="pt-2 border-t border-border flex flex-wrap gap-3">
                <ExternalLink
                  href={`https://www.ebi.ac.uk/intact/query/${encodeURIComponent(edge.sourceSymbol)}%20AND%20${encodeURIComponent(edge.targetSymbol)}`}
                  className="text-xs text-primary hover:underline"
                >
                  View in IntAct
                </ExternalLink>
                <ExternalLink
                  href={`https://thebiogrid.org/search.php?search=${encodeURIComponent(edge.sourceSymbol)}&organism=9606`}
                  className="text-xs text-primary hover:underline"
                >
                  View in BioGRID
                </ExternalLink>
                <ExternalLink
                  href={`https://string-db.org/cgi/network?identifiers=${encodeURIComponent(edge.sourceSymbol)}%0d${encodeURIComponent(edge.targetSymbol)}&species=9606`}
                  className="text-xs text-primary hover:underline"
                >
                  View in STRING
                </ExternalLink>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export const PPIEdgeDetailPanel = memo(PPIEdgeDetailPanelInner);
