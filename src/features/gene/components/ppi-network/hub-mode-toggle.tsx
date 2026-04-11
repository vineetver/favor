"use client";

import { cn } from "@infra/utils";
import { Label } from "@shared/components/ui/label";
import { Slider } from "@shared/components/ui/slider";
import { Switch } from "@shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Info, Zap } from "lucide-react";
import { memo, useCallback } from "react";
import type { HubModeState } from "./types";

interface HubModeToggleProps {
  hubMode: HubModeState;
  onChange: (hubMode: HubModeState) => void;
  disabled?: boolean;
  className?: string;
}

function HubModeToggleInner({
  hubMode,
  onChange,
  disabled = false,
  className,
}: HubModeToggleProps) {
  const handleToggle = useCallback(
    (checked: boolean) => {
      onChange({ ...hubMode, showHubsOnly: checked });
    },
    [hubMode, onChange],
  );

  const handleThresholdChange = useCallback(
    (value: number[]) => {
      onChange({ ...hubMode, hubThreshold: value[0] });
    },
    [hubMode, onChange],
  );

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <Zap
            className={cn(
              "w-4 h-4",
              hubMode.showHubsOnly ? "text-amber-500" : "text-muted-foreground",
            )}
          />
          <span className="text-sm font-medium text-foreground">Hub Focus</span>
          {hubMode.showHubsOnly && (
            <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
              Active
            </span>
          )}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor="hub-mode-toggle"
              className="text-xs text-muted-foreground"
            >
              Show hubs only
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs">
                  Filter to show only highly connected hub nodes. Requires "Hub
                  Score" color mode to be active.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="hub-mode-toggle"
            checked={hubMode.showHubsOnly}
            onCheckedChange={handleToggle}
            disabled={disabled}
          />
        </div>

        {/* Threshold slider - only show when hub mode is active */}
        {hubMode.showHubsOnly && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Percentile Threshold
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">
                      Show nodes above this degree percentile. E.g., 90 = top
                      10% most connected nodes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="text-xs font-medium text-foreground tabular-nums">
                Top {100 - hubMode.hubThreshold}%
              </span>
            </div>
            <Slider
              value={[hubMode.hubThreshold]}
              onValueChange={handleThresholdChange}
              min={50}
              max={99}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Top 50%</span>
              <span>Top 1%</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export const HubModeToggle = memo(HubModeToggleInner);
