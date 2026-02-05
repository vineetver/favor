"use client";

import { cn } from "@infra/utils";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Network,
  TrendingUp,
  Users,
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
  className?: string;
}

function PPIHubPanelInner({
  seedCentrality,
  topHubs,
  isLoading,
  onHubClick,
  className,
}: PPIHubPanelProps) {
  if (isLoading) {
    return (
      <div className={cn("border-t border-border bg-background", className)}>
        <div className="px-6 py-3 border-b border-border bg-muted flex items-center gap-2">
          <Network className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Network Importance</span>
        </div>
        <div className="px-6 py-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!seedCentrality) {
    return null;
  }

  return (
    <div className={cn("border-t border-border bg-background", className)}>
      {/* Header - matches edge detail panel */}
      <div className="px-6 py-3 border-b border-border bg-muted flex items-center gap-2">
        <Network className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Network Importance
        </span>
      </div>

      {/* Content - matches edge detail panel spacing */}
      <div className="px-6 py-4 space-y-5">
        {/* Gene summary - like edge summary */}
        <div className="flex items-center gap-2 text-lg">
          <span className="font-semibold text-primary">{seedCentrality.entity.label}</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            Seed Gene
          </span>
        </div>

        {/* Stats grid - matches edge detail panel */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              Interactions
            </div>
            <div className="text-xl font-semibold text-foreground">
              {seedCentrality.degree.total.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Connectivity
            </div>
            <div className="text-xl font-semibold text-foreground">
              Top {(100 - seedCentrality.percentile.total).toFixed(0)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Network className="w-3.5 h-3.5" />
              Rank
            </div>
            <div className="text-xl font-semibold text-foreground">
              {seedCentrality.percentile.total >= 90 ? "Hub" : seedCentrality.percentile.total >= 70 ? "High" : "Normal"}
            </div>
          </div>
        </div>

        {/* Insight text */}
        <div className="text-sm text-muted-foreground">
          This gene has more interactions than{" "}
          <span className="font-semibold text-foreground">{seedCentrality.percentile.total.toFixed(0)}%</span>{" "}
          of genes in the network
          {seedCentrality.percentile.total >= 90 && (
            <span className="text-warning">, suggesting it may be a hub protein involved in multiple pathways</span>
          )}
          .
        </div>

        {/* Most connected partners - using same section pattern */}
        {topHubs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Most Connected Partners
            </div>
            <div className="flex flex-wrap gap-2">
              {topHubs.map((hub) => (
                <button
                  key={hub.entity.id}
                  onClick={() => onHubClick?.(hub.entity.id)}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors group"
                >
                  <span className="text-xs font-medium text-foreground group-hover:text-primary">
                    {hub.entity.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {hub.degree.total.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External links - matches edge detail panel */}
        <div className="pt-2 border-t border-border flex flex-wrap gap-3">
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
