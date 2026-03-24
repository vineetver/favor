"use client";

import { cn } from "@infra/utils";
import { memo } from "react";
import { getClusterColor, getClusterStats } from "../../utils/clustering";
import type { ClusterState } from "./types";

interface PPIClusterLegendProps {
  clusterState: ClusterState;
  /** Total number of nodes in the graph (to calculate unclustered count) */
  totalNodes?: number;
  className?: string;
}

function PPIClusterLegendInner({ clusterState, totalNodes, className }: PPIClusterLegendProps) {
  // Don't show legend if clustering is disabled or no clusters
  if (!clusterState.enabled || clusterState.clusters.size === 0) {
    return null;
  }

  const stats = getClusterStats(clusterState.clusters);
  const clusterEntries = Array.from(clusterState.clusters.entries());

  // Calculate unclustered nodes count
  const clusteredNodeCount = clusterEntries.reduce((sum, [, nodes]) => sum + nodes.length, 0);
  const unclusteredCount = totalNodes ? Math.max(0, totalNodes - clusteredNodeCount - 1) : 0; // -1 for seed

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-10",
        "bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-sm",
        "p-3 max-w-[200px]",
        className
      )}
    >
      <div className="text-xs font-medium text-foreground mb-2">
        Clusters ({stats.numClusters})
      </div>
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
        {clusterEntries.slice(0, 8).map(([clusterId, nodeIds], index) => {
          const colors = getClusterColor(index);
          const isCollapsed = clusterState.collapsedClusters.has(clusterId);

          return (
            <div
              key={clusterId}
              className="flex items-center gap-2 text-xs"
            >
              <div
                className="w-3 h-3 rounded-sm border-2 shrink-0"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
              />
              <span className="text-muted-foreground truncate">
                {nodeIds.length} nodes
                {isCollapsed && (
                  <span className="text-muted-foreground ml-1">(collapsed)</span>
                )}
              </span>
            </div>
          );
        })}
        {clusterEntries.length > 8 && (
          <div className="text-[10px] text-muted-foreground pt-1">
            +{clusterEntries.length - 8} more clusters
          </div>
        )}
        {/* Unclustered nodes */}
        {unclusteredCount > 0 && (
          <div className="flex items-center gap-2 text-xs pt-1 border-t border-border mt-1">
            <div
              className="w-3 h-3 rounded-sm border-2 shrink-0"
              style={{
                backgroundColor: "#f1f5f9",
                borderColor: "#94a3b8",
              }}
            />
            <span className="text-muted-foreground truncate">
              {unclusteredCount} unclustered
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const PPIClusterLegend = memo(PPIClusterLegendInner);
