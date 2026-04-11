"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { ChevronDown, ChevronUp, Info, Network } from "lucide-react";
import { memo, useCallback } from "react";
import { getClusterStats } from "../../utils/clustering";
import type { ClusterAlgorithm, ClusterState } from "./types";

interface ClusterControlsProps {
  clusterState: ClusterState;
  onChange: (state: ClusterState) => void;
  onRunClustering: () => void;
  className?: string;
}

function ClusterControlsInner({
  clusterState,
  onChange,
  onRunClustering,
  className,
}: ClusterControlsProps) {
  const stats = getClusterStats(clusterState.clusters);

  const handleToggle = useCallback(
    (checked: boolean) => {
      onChange({ ...clusterState, enabled: checked });
      if (checked && clusterState.clusters.size === 0) {
        onRunClustering();
      }
    },
    [clusterState, onChange, onRunClustering],
  );

  const handleAlgorithmChange = useCallback(
    (algorithm: ClusterAlgorithm) => {
      onChange({ ...clusterState, algorithm });
      if (clusterState.enabled) {
        onRunClustering();
      }
    },
    [clusterState, onChange, onRunClustering],
  );

  const handleCollapseAll = useCallback(() => {
    onChange({
      ...clusterState,
      collapsedClusters: new Set(clusterState.clusters.keys()),
    });
  }, [clusterState, onChange]);

  const handleExpandAll = useCallback(() => {
    onChange({
      ...clusterState,
      collapsedClusters: new Set(),
    });
  }, [clusterState, onChange]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Network
            className={cn(
              "w-4 h-4",
              clusterState.enabled
                ? "text-indigo-600"
                : "text-muted-foreground",
            )}
          />
          <span className="text-sm font-medium text-foreground">
            Clustering
          </span>
          {clusterState.enabled && stats.numClusters > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
              {stats.numClusters} clusters
            </span>
          )}
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor="cluster-toggle"
              className="text-xs text-muted-foreground"
            >
              Enable clustering
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  Group densely connected nodes into communities. Useful for
                  identifying functional modules.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="cluster-toggle"
            checked={clusterState.enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Algorithm selector - only show when enabled */}
        {clusterState.enabled && (
          <>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Algorithm
                </Label>
              </div>
              <div className="flex rounded-lg border border-border bg-muted p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAlgorithmChange("louvain")}
                      className={cn(
                        "h-7 px-3 text-xs rounded-md flex-1",
                        clusterState.algorithm === "louvain"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-transparent",
                      )}
                    >
                      Louvain
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      Modularity-based clustering. Better quality.
                    </p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAlgorithmChange("label-propagation")}
                      className={cn(
                        "h-7 px-3 text-xs rounded-md flex-1",
                        clusterState.algorithm === "label-propagation"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-transparent",
                      )}
                    >
                      Label Prop
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      Label propagation. Faster for large networks.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Cluster stats and actions */}
            {stats.numClusters > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Clusters found:</span>
                    <span className="font-medium text-foreground">
                      {stats.numClusters}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg size:</span>
                    <span className="font-medium text-foreground">
                      {stats.avgSize.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Largest:</span>
                    <span className="font-medium text-foreground">
                      {stats.maxSize} nodes
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCollapseAll}
                    className="h-7 flex-1 text-xs"
                  >
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Collapse All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExpandAll}
                    className="h-7 flex-1 text-xs"
                  >
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Expand All
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export const ClusterControls = memo(ClusterControlsInner);
