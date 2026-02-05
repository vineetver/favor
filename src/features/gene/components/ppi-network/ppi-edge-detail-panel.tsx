"use client";

import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Database,
  FileText,
  FlaskConical,
  Info,
  X,
} from "lucide-react";
import { memo } from "react";
import { formatConfidenceScore } from "../../utils/ppi-graph-utils";
import type { PPIEdge } from "./types";

interface PPIEdgeDetailPanelProps {
  edge: PPIEdge | null;
  onClose: () => void;
  className?: string;
}

function PPIEdgeDetailPanelInner({ edge, onClose, className }: PPIEdgeDetailPanelProps) {
  if (!edge) return null;

  return (
    <div
      className={cn(
        "border-t border-slate-200 bg-white",
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Explain this interaction
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-5">
        {/* Interaction summary */}
        <div className="flex items-center gap-2 text-lg">
          <span className="font-semibold text-indigo-600">{edge.sourceSymbol}</span>
          <span className="text-slate-400">⟷</span>
          <span className="font-semibold text-slate-700">{edge.targetSymbol}</span>
        </div>

        {/* Evidence stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Database className="w-3.5 h-3.5" />
              Sources
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {edge.numSources ?? "N/A"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FlaskConical className="w-3.5 h-3.5" />
              Experiments
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {edge.numExperiments ?? "N/A"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5" />
              Publications
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {edge.pubmedIds?.length ?? 0}
            </div>
          </div>
        </div>

        {/* Confidence scores */}
        {edge.confidenceScores.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Confidence Scores
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-700">
                Average: <span className="font-semibold">{formatConfidenceScore(edge.confidenceScores)}</span>
              </div>
              <div className="text-xs text-slate-400">
                ({edge.confidenceScores.length} score{edge.confidenceScores.length !== 1 ? "s" : ""})
              </div>
            </div>
          </div>
        )}

        {/* Sources list */}
        {edge.sources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Supporting Databases
            </div>
            <div className="flex flex-wrap gap-2">
              {edge.sources.map((source, idx) => (
                <span
                  key={`${source.name}-${idx}`}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700"
                >
                  {source.name}
                  {source.experimentCount !== undefined && (
                    <span className="ml-1.5 text-slate-400">
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
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
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
                <span className="text-xs text-slate-400">
                  +{edge.detectionMethods.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Publications */}
        {edge.pubmedIds && edge.pubmedIds.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
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
                <span className="text-xs text-slate-400">
                  +{edge.pubmedIds.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* External links */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3">
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
    </div>
  );
}

export const PPIEdgeDetailPanel = memo(PPIEdgeDetailPanelInner);
