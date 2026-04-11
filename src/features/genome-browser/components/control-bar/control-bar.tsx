"use client";

// src/features/genome-browser/components/control-bar/control-bar.tsx
// Compact control bar with navigation and zoom controls

import { cn } from "@infra/utils";
import { Skeleton } from "@shared/components/ui/skeleton";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useBrowserActions,
  useBrowserRegion,
  useCanZoomIn,
  useCanZoomOut,
  useVisibleTrackCount,
} from "../../state/browser-context";
import type { GenomicRegion } from "../../types/state";
import { RegionDisplay } from "../shared/region-display";
import { ToolbarButton } from "../shared/toolbar-button";

type ControlBarProps = {
  className?: string;
  initialRegion?: GenomicRegion;
};

export function ControlBar({ className, initialRegion }: ControlBarProps) {
  const region = useBrowserRegion();
  const actions = useBrowserActions();
  const canZoomIn = useCanZoomIn();
  const canZoomOut = useCanZoomOut();
  const visibleCount = useVisibleTrackCount();

  if (!region) {
    return <ControlBarSkeleton className={className} />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b border-border bg-card",
        className,
      )}
    >
      <RegionDisplay region={region} />

      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <ToolbarButton
            icon={ChevronLeft}
            label="Pan left"
            onClick={actions.panLeft}
          />
          <ToolbarButton
            icon={ChevronRight}
            label="Pan right"
            onClick={actions.panRight}
          />

          <div className="w-px h-4 bg-border mx-1" />

          <ToolbarButton
            icon={ZoomOut}
            label="Zoom out"
            onClick={actions.zoomOut}
            disabled={!canZoomOut}
          />
          <ToolbarButton
            icon={ZoomIn}
            label="Zoom in"
            onClick={actions.zoomIn}
            disabled={!canZoomIn}
          />

          {initialRegion && (
            <ToolbarButton
              icon={RotateCcw}
              label="Reset view"
              onClick={() => actions.resetView(initialRegion)}
            />
          )}
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{visibleCount} tracks</span>
      </div>
    </div>
  );
}

function ControlBarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 border-b border-border bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export { ControlBarSkeleton };
