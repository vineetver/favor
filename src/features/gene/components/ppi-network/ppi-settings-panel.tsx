"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Filter, Info, Network, Zap } from "lucide-react";
import { memo, useCallback } from "react";
import { getClusterStats } from "../../utils/clustering";
import type {
  ClusterAlgorithm,
  ColorMode,
  EdgeFilterConfig,
  FeatureMode,
  FilteredEdgeDisplay,
} from "./types";

interface PPISettingsPanelProps {
  /** Current color mode */
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  /** Edge filter configuration */
  edgeFilter: EdgeFilterConfig;
  onEdgeFilterChange: (filter: EdgeFilterConfig) => void;
  maxExperiments: number;
  /** Feature mode (hub focus vs clustering - mutually exclusive) */
  featureMode: FeatureMode;
  onFeatureModeChange: (mode: FeatureMode) => void;
  /** Callback to run clustering algorithm */
  onRunClustering: () => void;
  /** Current cluster data for stats */
  clusterData?: Map<string, string[]>;
  className?: string;
}

function PPISettingsPanelInner({
  colorMode,
  onColorModeChange,
  edgeFilter,
  onEdgeFilterChange,
  maxExperiments,
  featureMode,
  onFeatureModeChange,
  onRunClustering,
  clusterData,
  className,
}: PPISettingsPanelProps) {
  const clusterStats = clusterData ? getClusterStats(clusterData) : null;
  const hasActiveFilter = edgeFilter.minSources > 0 || edgeFilter.minExperiments > 0;

  // Edge filter handlers
  const handleMinSourcesChange = useCallback(
    (value: number[]) => {
      onEdgeFilterChange({ ...edgeFilter, minSources: value[0] });
    },
    [edgeFilter, onEdgeFilterChange]
  );

  const handleMinExperimentsChange = useCallback(
    (value: number[]) => {
      onEdgeFilterChange({ ...edgeFilter, minExperiments: value[0] });
    },
    [edgeFilter, onEdgeFilterChange]
  );

  const handleDisplayChange = useCallback(
    (display: FilteredEdgeDisplay) => {
      onEdgeFilterChange({ ...edgeFilter, display });
    },
    [edgeFilter, onEdgeFilterChange]
  );

  // Feature mode handlers
  const handleFeatureModeChange = useCallback(
    (value: string) => {
      switch (value) {
        case "none":
          onFeatureModeChange({ type: "none" });
          break;
        case "hubFocus":
          onFeatureModeChange({ type: "hubFocus", threshold: 90 });
          break;
        case "clustering":
          onFeatureModeChange({ type: "clustering", algorithm: "louvain" });
          onRunClustering();
          break;
      }
    },
    [onFeatureModeChange, onRunClustering]
  );

  const handleHubThresholdChange = useCallback(
    (value: number[]) => {
      if (featureMode.type === "hubFocus") {
        onFeatureModeChange({ type: "hubFocus", threshold: value[0] });
      }
    },
    [featureMode, onFeatureModeChange]
  );

  const handleClusterAlgorithmChange = useCallback(
    (algorithm: ClusterAlgorithm) => {
      if (featureMode.type === "clustering") {
        onFeatureModeChange({ type: "clustering", algorithm });
        onRunClustering();
      }
    },
    [featureMode, onFeatureModeChange, onRunClustering]
  );

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", className)}>
        {/* VISUALIZATION SECTION */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Visualization
          </div>

          {/* Color Mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-slate-600">Color by</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">
                    Choose how nodes are colored: by experiment count (default) or by hub score (centrality).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onColorModeChange("experiments")}
                className={cn(
                  "h-7 px-3 text-xs rounded-md flex-1",
                  colorMode === "experiments"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
                )}
              >
                Experiments
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onColorModeChange("hub")}
                className={cn(
                  "h-7 px-3 text-xs rounded-md flex-1",
                  colorMode === "hub"
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
                )}
              >
                Hub Score
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200" />

        {/* EDGE FILTERING SECTION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className={cn(
              "w-4 h-4",
              hasActiveFilter ? "text-indigo-600" : "text-slate-400"
            )} />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Edge Filtering
            </span>
            {hasActiveFilter && (
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded">
                Active
              </span>
            )}
          </div>

          {/* Min Sources Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-600">Min. Sources</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">
                      Filter edges by minimum number of supporting databases (1-4).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {edgeFilter.minSources === 0 ? "All" : `${edgeFilter.minSources}+`}
              </span>
            </div>
            <Slider
              value={[edgeFilter.minSources]}
              onValueChange={handleMinSourcesChange}
              min={0}
              max={4}
              step={1}
              className="w-full"
            />
          </div>

          {/* Min Experiments Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-600">Min. Experiments</Label>
              </div>
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {edgeFilter.minExperiments === 0 ? "All" : `${edgeFilter.minExperiments}+`}
              </span>
            </div>
            <Slider
              value={[edgeFilter.minExperiments]}
              onValueChange={handleMinExperimentsChange}
              min={0}
              max={Math.min(maxExperiments, 50)}
              step={1}
              className="w-full"
            />
          </div>

          {/* Display Mode */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-slate-600">When filtered</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px]">
                  <p className="text-xs">
                    <strong>Grey out:</strong> Edges are dimmed but visible.<br/>
                    <strong>Hide edges:</strong> Edges are hidden.<br/>
                    <strong>Hide + orphans:</strong> Edges and disconnected nodes are hidden.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <RadioGroup
              value={edgeFilter.display}
              onValueChange={(v) => handleDisplayChange(v as FilteredEdgeDisplay)}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="grey" id="display-grey" className="h-3.5 w-3.5" />
                <Label htmlFor="display-grey" className="text-xs text-slate-600 cursor-pointer">
                  Grey out
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="hide" id="display-hide" className="h-3.5 w-3.5" />
                <Label htmlFor="display-hide" className="text-xs text-slate-600 cursor-pointer">
                  Hide edges
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="hide-cascade" id="display-cascade" className="h-3.5 w-3.5" />
                <Label htmlFor="display-cascade" className="text-xs text-slate-600 cursor-pointer">
                  Hide edges + orphan nodes
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="border-t border-slate-200" />

        {/* ADVANCED FEATURES SECTION */}
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Advanced Features
          </div>
          <p className="text-[10px] text-slate-400">
            Hub Focus and Clustering are mutually exclusive
          </p>

          <RadioGroup
            value={featureMode.type}
            onValueChange={handleFeatureModeChange}
            className="space-y-3"
          >
            {/* None */}
            <div className="flex items-start gap-2">
              <RadioGroupItem value="none" id="feature-none" className="h-4 w-4 mt-0.5" />
              <div>
                <Label htmlFor="feature-none" className="text-xs text-slate-700 cursor-pointer font-medium">
                  None
                </Label>
                <p className="text-[10px] text-slate-500">Standard visualization</p>
              </div>
            </div>

            {/* Hub Focus */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem
                  value="hubFocus"
                  id="feature-hub"
                  className="h-4 w-4 mt-0.5"
                  disabled={colorMode !== "hub"}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor="feature-hub"
                      className={cn(
                        "text-xs cursor-pointer font-medium",
                        colorMode !== "hub" ? "text-slate-400" : "text-slate-700"
                      )}
                    >
                      <Zap className="w-3 h-3 inline mr-1" />
                      Hub Focus
                    </Label>
                    {colorMode !== "hub" && (
                      <span className="text-[10px] text-amber-600">(requires Hub Score color mode)</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">Show only highly connected nodes</p>
                </div>
              </div>

              {/* Hub Focus Settings */}
              {featureMode.type === "hubFocus" && (
                <div className="ml-6 space-y-2 p-2 bg-amber-50/50 rounded-md border border-amber-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-600">Percentile Threshold</Label>
                    <span className="text-xs font-medium text-slate-700 tabular-nums">
                      Top {100 - featureMode.threshold}%
                    </span>
                  </div>
                  <Slider
                    value={[featureMode.threshold]}
                    onValueChange={handleHubThresholdChange}
                    min={50}
                    max={99}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Top 50%</span>
                    <span>Top 1%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Clustering */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="clustering" id="feature-cluster" className="h-4 w-4 mt-0.5" />
                <div>
                  <Label htmlFor="feature-cluster" className="text-xs text-slate-700 cursor-pointer font-medium">
                    <Network className="w-3 h-3 inline mr-1" />
                    Clustering
                  </Label>
                  <p className="text-[10px] text-slate-500">Group nodes into communities</p>
                </div>
              </div>

              {/* Clustering Settings */}
              {featureMode.type === "clustering" && (
                <div className="ml-6 space-y-2 p-2 bg-indigo-50/50 rounded-md border border-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-slate-600">Algorithm</Label>
                  </div>
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClusterAlgorithmChange("louvain")}
                      className={cn(
                        "h-6 px-2 text-[10px] rounded flex-1",
                        featureMode.algorithm === "louvain"
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
                      )}
                    >
                      Louvain
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClusterAlgorithmChange("label-propagation")}
                      className={cn(
                        "h-6 px-2 text-[10px] rounded flex-1",
                        featureMode.algorithm === "label-propagation"
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
                      )}
                    >
                      Label Prop
                    </Button>
                  </div>

                  {/* Cluster Stats */}
                  {clusterStats && clusterStats.numClusters > 0 && (
                    <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-indigo-100">
                      <div className="flex justify-between">
                        <span>Clusters found:</span>
                        <span className="font-medium text-slate-700">{clusterStats.numClusters}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg size:</span>
                        <span className="font-medium text-slate-700">{clusterStats.avgSize.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </RadioGroup>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const PPISettingsPanel = memo(PPISettingsPanelInner);
