"use client";

import { cn } from "@infra/utils";
import { Label } from "@shared/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Filter, Info } from "lucide-react";
import { memo, useCallback } from "react";
import type { EdgeFilterState } from "./types";

interface EdgeFilterControlsProps {
  filter: EdgeFilterState;
  onChange: (filter: EdgeFilterState) => void;
  /** Maximum experiments value in the dataset (for slider range) */
  maxExperiments?: number;
  className?: string;
}

function EdgeFilterControlsInner({
  filter,
  onChange,
  maxExperiments = 100,
  className,
}: EdgeFilterControlsProps) {
  const handleMinSourcesChange = useCallback(
    (value: number[]) => {
      onChange({ ...filter, minSources: value[0] });
    },
    [filter, onChange]
  );

  const handleMinExperimentsChange = useCallback(
    (value: number[]) => {
      onChange({ ...filter, minExperiments: value[0] });
    },
    [filter, onChange]
  );

  const handleGreyOutToggle = useCallback(
    (checked: boolean) => {
      onChange({ ...filter, greyOutBelowThreshold: checked });
    },
    [filter, onChange]
  );

  const hasActiveFilter = filter.minSources > 0 || filter.minExperiments > 0;

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Filter className={cn(
            "w-4 h-4",
            hasActiveFilter ? "text-indigo-600" : "text-slate-400"
          )} />
          <span className="text-sm font-medium text-slate-700">Edge Filters</span>
          {hasActiveFilter && (
            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
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
                    Higher values show more confident interactions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-medium text-slate-700 tabular-nums">
              {filter.minSources === 0 ? "All" : `${filter.minSources}+`}
            </span>
          </div>
          <Slider
            value={[filter.minSources]}
            onValueChange={handleMinSourcesChange}
            min={0}
            max={4}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>All</span>
            <span>4+</span>
          </div>
        </div>

        {/* Min Experiments Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-slate-600">Min. Experiments</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">
                    Filter edges by minimum number of supporting experiments.
                    Higher values show more validated interactions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-medium text-slate-700 tabular-nums">
              {filter.minExperiments === 0 ? "All" : `${filter.minExperiments}+`}
            </span>
          </div>
          <Slider
            value={[filter.minExperiments]}
            onValueChange={handleMinExperimentsChange}
            min={0}
            max={Math.min(maxExperiments, 50)}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>All</span>
            <span>{Math.min(maxExperiments, 50)}+</span>
          </div>
        </div>

        {/* Grey Out Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="grey-out-toggle" className="text-xs text-slate-600">
              Grey out (vs hide)
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  When enabled, edges below threshold are greyed out but still visible.
                  When disabled, they are completely hidden.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="grey-out-toggle"
            checked={filter.greyOutBelowThreshold}
            onCheckedChange={handleGreyOutToggle}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export const EdgeFilterControls = memo(EdgeFilterControlsInner);
