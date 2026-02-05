"use client";

import { ExternalLink } from "@shared/components/ui/external-link";
import { Loader2, X } from "lucide-react";
import { memo } from "react";
import { getCategoryColor, type PathwayDetailPanelProps } from "./types";

function PathwayDetailPanelInner({
  pathway,
  enrichment,
  seedGeneSymbol,
  onClose,
}: PathwayDetailPanelProps) {
  const colors = getCategoryColor(pathway.category);

  // Deduplicate shared genes by ID
  const uniqueSharedGenes =
    enrichment.status === "loaded"
      ? Array.from(
          new Map(enrichment.data.sharedGenes.map((g) => [g.id, g])).values()
        )
      : [];

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colors.border }}
          />
          <span className="font-medium text-slate-900">{pathway.name}</span>
          <span
            className="px-2 py-0.5 rounded text-xs shrink-0"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {pathway.category}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ExternalLink
            href={pathway.url}
            className="text-sm text-indigo-600 hover:underline"
          >
            {pathway.source === "reactome" ? "Reactome" : "WikiPathways"} →
          </ExternalLink>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {/* Loading */}
        {enrichment.status === "loading" && (
          <div className="flex items-center gap-2 py-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading pathway details...</span>
          </div>
        )}

        {/* Error */}
        {enrichment.status === "error" && (
          <div className="text-sm text-amber-700">
            Unable to load pathway details
          </div>
        )}

        {/* Loaded */}
        {enrichment.status === "loaded" && (
          <div className="space-y-4">
            {/* Main insight - what this pathway means for the user's gene */}
            <div className="flex items-baseline gap-6">
              <div>
                <span className="text-2xl font-semibold text-slate-900">
                  {enrichment.data.geneCount}
                </span>
                <span className="text-sm text-slate-500 ml-2">
                  genes participate in this pathway
                </span>
              </div>

              {uniqueSharedGenes.length > 0 && (
                <div>
                  <span className="text-2xl font-semibold text-indigo-600">
                    {uniqueSharedGenes.length}
                  </span>
                  <span className="text-sm text-slate-500 ml-2">
                    of {seedGeneSymbol}'s interactors are also in this pathway
                  </span>
                </div>
              )}
            </div>

            {/* Interactors list */}
            {uniqueSharedGenes.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSharedGenes.slice(0, 15).map((gene) => (
                    <span
                      key={gene.id}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded font-medium"
                    >
                      {gene.symbol}
                    </span>
                  ))}
                  {uniqueSharedGenes.length > 15 && (
                    <span className="px-2 py-0.5 text-slate-400 text-xs">
                      +{uniqueSharedGenes.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Related diseases */}
            {enrichment.data.relatedDiseases.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  Linked to {enrichment.data.relatedDiseases.length} disease{enrichment.data.relatedDiseases.length !== 1 ? "s" : ""}:
                </span>
                <span className="text-sm text-slate-700 ml-2">
                  {enrichment.data.relatedDiseases.slice(0, 3).map(d => d.name).join(", ")}
                  {enrichment.data.relatedDiseases.length > 3 && ` and ${enrichment.data.relatedDiseases.length - 3} more`}
                </span>
              </div>
            )}

            {/* Hierarchy context */}
            {enrichment.data.parentPathway && (
              <div className="text-sm text-slate-500">
                This is a sub-pathway of <span className="text-slate-700 font-medium">{enrichment.data.parentPathway.name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const PathwayDetailPanel = memo(PathwayDetailPanelInner);
