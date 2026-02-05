"use client";

import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Network,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { memo } from "react";
import type { CentralityData } from "./types";

interface PPIHubPanelProps {
  /** Centrality data for the seed gene */
  seedCentrality: CentralityData | null;
  /** Top hub interactors sorted by centrality */
  topHubs: CentralityData[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when a hub is clicked */
  onHubClick?: (geneId: string) => void;
  /** Callback to close the panel */
  onClose?: () => void;
  className?: string;
}

function PPIHubPanelInner({
  seedCentrality,
  topHubs,
  isLoading,
  onHubClick,
  onClose,
  className,
}: PPIHubPanelProps) {
  if (isLoading) {
    return (
      <div className={cn("border-t border-slate-200 bg-white", className)}>
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Network className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Network Importance</span>
        </div>
        <div className="px-6 py-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!seedCentrality) {
    return null;
  }

  return (
    <div className={cn("border-t border-slate-200 bg-white", className)}>
      {/* Header - matches edge detail panel */}
      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            Network Importance
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
            aria-label="Close panel"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Content - matches edge detail panel spacing */}
      <div className="px-6 py-4 space-y-5">
        {/* Gene summary - like edge summary */}
        <div className="flex items-center gap-2 text-lg">
          <span className="font-semibold text-indigo-600">{seedCentrality.entity.label}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
            Seed Gene
          </span>
        </div>

        {/* Stats grid - matches edge detail panel */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              Interactions
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {seedCentrality.degree.total.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp className="w-3.5 h-3.5" />
              Connectivity
            </div>
            <div className="text-xl font-semibold text-slate-900">
              Top {(100 - seedCentrality.percentile.total).toFixed(0)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Network className="w-3.5 h-3.5" />
              Rank
            </div>
            <div className="text-xl font-semibold text-slate-900">
              {seedCentrality.percentile.total >= 90 ? "Hub" : seedCentrality.percentile.total >= 70 ? "High" : "Normal"}
            </div>
          </div>
        </div>

        {/* Insight text */}
        <div className="text-sm text-slate-600">
          This gene has more interactions than{" "}
          <span className="font-semibold text-slate-900">{seedCentrality.percentile.total.toFixed(0)}%</span>{" "}
          of genes in the network
          {seedCentrality.percentile.total >= 90 && (
            <span className="text-amber-700">, suggesting it may be a hub protein involved in multiple pathways</span>
          )}
          .
        </div>

        {/* Most connected partners - using same section pattern */}
        {topHubs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Most Connected Partners
            </div>
            <div className="flex flex-wrap gap-2">
              {topHubs.map((hub) => (
                <button
                  key={hub.entity.id}
                  onClick={() => onHubClick?.(hub.entity.id)}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors group"
                >
                  <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600">
                    {hub.entity.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {hub.degree.total.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External links - matches edge detail panel */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3">
          <ExternalLink
            href={`https://string-db.org/cgi/network?identifiers=${encodeURIComponent(seedCentrality.entity.label)}&species=9606`}
            className="text-xs text-primary hover:underline"
          >
            View in STRING
          </ExternalLink>
          <ExternalLink
            href={`https://thebiogrid.org/search.php?search=${encodeURIComponent(seedCentrality.entity.label)}&organism=9606`}
            className="text-xs text-primary hover:underline"
          >
            View in BioGRID
          </ExternalLink>
        </div>
      </div>
    </div>
  );
}

export const PPIHubPanel = memo(PPIHubPanelInner);
