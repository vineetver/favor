"use client";

import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Loader2, X } from "lucide-react";
import { memo } from "react";
import { getCategoryColor, type PathwayDetailPanelProps } from "./types";

/**
 * Rich detail panel showing pathway enrichment data.
 * Displays gene counts, shared genes, diseases, and hierarchy info.
 */
function PathwayDetailPanelInner({
  pathway,
  enrichment,
  onClose,
}: PathwayDetailPanelProps) {
  const colors = getCategoryColor(pathway.category);

  return (
    <div className="border-t border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
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
              <span>-</span>
              <span>{pathway.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExternalLink
              href={pathway.url}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              View{" "}
              {pathway.source === "reactome" ? "Reactome" : "WikiPathways"}
            </ExternalLink>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Enrichment content */}
      {enrichment.status === "loading" && (
        <div className="px-6 py-8 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading enrichment data...</span>
        </div>
      )}

      {enrichment.status === "error" && (
        <div className="px-6 py-4 text-sm text-amber-700 bg-amber-50">
          Unable to load enrichment data: {enrichment.error}
        </div>
      )}

      {enrichment.status === "loaded" && (
        <>
          {/* Stats bar */}
          <div className="px-6 py-3 flex items-center gap-6 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {enrichment.data.geneCount}
              </span>
              <span className="text-sm text-slate-500">genes</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {enrichment.data.sharedGenes.length}
              </span>
              <span className="text-sm text-slate-500">shared genes</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {enrichment.data.relatedDiseases.length}
              </span>
              <span className="text-sm text-slate-500">diseases</span>
            </div>
          </div>

          {/* Three-column details */}
          <div className="px-6 py-4 grid grid-cols-3 gap-6">
            {/* Shared Genes */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Shared Genes
              </h4>
              {enrichment.data.sharedGenes.length === 0 ? (
                <p className="text-sm text-slate-400">No shared genes</p>
              ) : (
                <ul className="space-y-1">
                  {enrichment.data.sharedGenes.map((gene) => (
                    <li key={gene.id} className="text-sm text-slate-700">
                      {gene.symbol}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Related Diseases */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Related Diseases
              </h4>
              {enrichment.data.relatedDiseases.length === 0 ? (
                <p className="text-sm text-slate-400">No related diseases</p>
              ) : (
                <ul className="space-y-1">
                  {enrichment.data.relatedDiseases.map((disease) => (
                    <li
                      key={disease.id}
                      className="text-sm text-slate-700 truncate"
                      title={disease.name}
                    >
                      {disease.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Hierarchy */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Hierarchy
              </h4>
              <div className="space-y-2">
                {enrichment.data.parentPathway ? (
                  <div>
                    <span className="text-xs text-slate-500">Parent:</span>
                    <p
                      className="text-sm text-slate-700 truncate"
                      title={enrichment.data.parentPathway.name}
                    >
                      {enrichment.data.parentPathway.name}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No parent pathway</p>
                )}

                {enrichment.data.childPathways.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">
                      Children: {enrichment.data.childPathways.length}
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {enrichment.data.childPathways.slice(0, 3).map((child) => (
                        <li
                          key={child.id}
                          className="text-sm text-slate-600 truncate"
                          title={child.name}
                        >
                          {child.name}
                        </li>
                      ))}
                      {enrichment.data.childPathways.length > 3 && (
                        <li className="text-sm text-slate-400">
                          +{enrichment.data.childPathways.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {enrichment.status === "idle" && (
        <div className="px-6 py-4 text-sm text-slate-500">
          Select a pathway to view enrichment details.
        </div>
      )}
    </div>
  );
}

export const PathwayDetailPanel = memo(PathwayDetailPanelInner);
