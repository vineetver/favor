"use client";

import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  Beaker,
  ChevronDown,
  ChevronUp,
  Database,
  HeartPulse,
  Loader2,
  Network,
  ShieldCheck,
} from "lucide-react";
import { memo, useState } from "react";
import { getCategoryColor, type PathwayDetailPanelProps } from "./types";

function PathwayDetailPanelInner({
  pathway,
  enrichment,
  diseaseEnrichment,
  seedGeneSymbol,
  open,
  onOpenChange,
  onLoadDiseases,
}: PathwayDetailPanelProps) {
  const [showAllDiseases, setShowAllDiseases] = useState(false);

  if (!pathway) return null;

  const colors = getCategoryColor(pathway.category);

  // Deduplicate shared genes by ID
  const uniqueSharedGenes =
    enrichment.status === "loaded"
      ? Array.from(
          new Map(enrichment.data.sharedGenes.map((g) => [g.id, g])).values()
        )
      : [];

  const displayedDiseases =
    diseaseEnrichment.status === "loaded"
      ? showAllDiseases
        ? diseaseEnrichment.data.diseases
        : diseaseEnrichment.data.diseases.slice(0, 5)
      : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: colors.border }}
            />
            <span
              className="px-2 py-0.5 rounded text-xs shrink-0"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {pathway.category}
            </span>
          </div>
          <SheetTitle className="text-lg font-semibold text-slate-900 leading-tight">
            {pathway.name}
          </SheetTitle>
          <SheetDescription className="text-xs font-mono text-slate-500">
            {pathway.id}
          </SheetDescription>
          <div className="pt-2">
            <ExternalLink
              href={pathway.url}
              className="text-sm text-indigo-600 hover:underline"
            >
              View on {pathway.source === "reactome" ? "Reactome" : "WikiPathways"} →
            </ExternalLink>
          </div>
        </SheetHeader>

        {/* Evidence Stats Grid */}
        {(pathway.numSources || pathway.numExperiments || pathway.confidenceScore) && (
          <div className="py-4 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Evidence
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {pathway.numSources !== undefined && (
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Database className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-blue-700">
                    {pathway.numSources}
                  </div>
                  <div className="text-xs text-blue-600">Sources</div>
                </div>
              )}
              {pathway.numExperiments !== undefined && (
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <Beaker className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-emerald-700">
                    {pathway.numExperiments}
                  </div>
                  <div className="text-xs text-emerald-600">Experiments</div>
                </div>
              )}
              {pathway.confidenceScore !== undefined && (
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <ShieldCheck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <div className="text-xl font-semibold text-amber-700">
                    {pathway.confidenceScore.toFixed(2)}
                  </div>
                  <div className="text-xs text-amber-600">Confidence</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {enrichment.status === "loading" && (
          <div className="flex items-center gap-2 py-6 text-slate-500 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading pathway details...</span>
          </div>
        )}

        {/* Error State */}
        {enrichment.status === "error" && (
          <div className="py-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 my-4">
            Unable to load pathway details
          </div>
        )}

        {/* Loaded Content */}
        {enrichment.status === "loaded" && (
          <div className="space-y-4 py-4">
            {/* Gene participation stats */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Pathway Involvement
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-slate-600">Total genes in pathway</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {enrichment.data.geneCount}
                  </span>
                </div>
                {uniqueSharedGenes.length > 0 && (
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-600">
                      {seedGeneSymbol}'s interactors also here
                    </span>
                    <span className="text-lg font-semibold text-indigo-600">
                      {uniqueSharedGenes.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Shared Genes / Interactors */}
            {uniqueSharedGenes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Shared Interactors
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSharedGenes.slice(0, 20).map((gene) => (
                    <span
                      key={gene.id}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded font-medium"
                    >
                      {gene.symbol}
                    </span>
                  ))}
                  {uniqueSharedGenes.length > 20 && (
                    <span className="px-2 py-0.5 text-slate-400 text-xs">
                      +{uniqueSharedGenes.length - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Hierarchy context */}
            {(enrichment.data.parentPathway || enrichment.data.childPathways.length > 0) && (
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Pathway Hierarchy
                </h3>
                {enrichment.data.parentPathway && (
                  <div className="text-sm text-slate-600 mb-2">
                    <span className="text-slate-400">Parent: </span>
                    <span className="font-medium text-slate-700">
                      {enrichment.data.parentPathway.name}
                    </span>
                  </div>
                )}
                {enrichment.data.childPathways.length > 0 && (
                  <div className="text-sm text-slate-600">
                    <span className="text-slate-400">Sub-pathways: </span>
                    <span className="text-slate-700">
                      {enrichment.data.childPathways.slice(0, 3).map((c) => c.name).join(", ")}
                      {enrichment.data.childPathways.length > 3 &&
                        ` and ${enrichment.data.childPathways.length - 3} more`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Disease Context Section */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5" />
                  Disease Context
                </h3>
                {diseaseEnrichment.status === "idle" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLoadDiseases}
                    className="text-xs h-7"
                  >
                    Load Diseases
                  </Button>
                )}
              </div>

              {diseaseEnrichment.status === "loading" && (
                <div className="flex items-center gap-2 py-3 text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Loading disease associations...</span>
                </div>
              )}

              {diseaseEnrichment.status === "error" && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                  Unable to load disease associations
                </div>
              )}

              {diseaseEnrichment.status === "loaded" && (
                <>
                  {diseaseEnrichment.data.diseases.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No disease associations found for genes in this pathway.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 mb-2">
                        {diseaseEnrichment.data.totalDiseases} diseases associated with pathway genes
                      </p>
                      {displayedDiseases.map((assoc) => (
                        <div
                          key={assoc.disease.id}
                          className="bg-rose-50/50 rounded-lg p-2.5 border border-rose-100"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-rose-900">
                              {assoc.disease.name}
                            </span>
                            <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                              {assoc.geneCount} gene{assoc.geneCount > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {assoc.genes.slice(0, 5).map((gene) => (
                              <span
                                key={gene.id}
                                className="text-xs text-rose-700"
                              >
                                {gene.symbol}
                              </span>
                            ))}
                            {assoc.geneCount > 5 && (
                              <span className="text-xs text-rose-400">
                                +{assoc.geneCount - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {diseaseEnrichment.data.diseases.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllDiseases(!showAllDiseases)}
                          className="w-full text-xs h-7 text-slate-500"
                        >
                          {showAllDiseases ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 mr-1" />
                              Show {diseaseEnrichment.data.diseases.length - 5} More
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export const PathwayDetailPanel = memo(PathwayDetailPanelInner);
