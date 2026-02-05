"use client";

import { ExternalLink } from "@shared/components/ui/external-link";
import { Loader2, X } from "lucide-react";
import { memo } from "react";
import { getCategoryColor, type PathwayDetailPanelProps } from "./types";

function PathwayDetailPanelInner({
  pathway,
  enrichment,
  onClose,
}: PathwayDetailPanelProps) {
  const colors = getCategoryColor(pathway.category);

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: colors.border }}
          />
          <span className="font-medium text-slate-900">{pathway.name}</span>
          <span className="text-xs text-slate-500 font-mono">{pathway.id}</span>
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
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {/* Error */}
        {enrichment.status === "error" && (
          <div className="text-sm text-amber-700">
            Unable to load details
          </div>
        )}

        {/* Loaded */}
        {enrichment.status === "loaded" && (
          <div className="flex gap-12">
            {/* Stats */}
            <div className="flex gap-8 text-sm">
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {enrichment.data.geneCount}
                </div>
                <div className="text-slate-500">genes in pathway</div>
              </div>
              {enrichment.data.sharedGenes.length > 0 && (
                <div>
                  <div className="text-2xl font-semibold text-indigo-600">
                    {enrichment.data.sharedGenes.length}
                  </div>
                  <div className="text-slate-500">interactors in pathway</div>
                </div>
              )}
              {enrichment.data.relatedDiseases.length > 0 && (
                <div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {enrichment.data.relatedDiseases.length}
                  </div>
                  <div className="text-slate-500">diseases</div>
                </div>
              )}
            </div>

            {/* Interactors also in this pathway */}
            {enrichment.data.sharedGenes.length > 0 && (
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-1.5">
                  Interactors also in this pathway
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {enrichment.data.sharedGenes.slice(0, 10).map((gene) => (
                    <span
                      key={gene.id}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded"
                    >
                      {gene.symbol}
                    </span>
                  ))}
                  {enrichment.data.sharedGenes.length > 10 && (
                    <span className="px-2 py-0.5 text-slate-400 text-xs">
                      +{enrichment.data.sharedGenes.length - 10}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Hierarchy */}
            {enrichment.data.parentPathway && (
              <div className="text-sm text-slate-500">
                Part of <span className="text-slate-700">{enrichment.data.parentPathway.name}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const PathwayDetailPanel = memo(PathwayDetailPanelInner);
