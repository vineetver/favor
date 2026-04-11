"use client";

// src/features/genome-browser/components/browser-canvas/track-header.tsx
// Track header with title and controls

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { GripVertical, Minus, Plus, X } from "lucide-react";
import { useBrowserActions } from "../../state/browser-context";
import type { ActiveTrack } from "../../types/tracks";

type TrackHeaderProps = {
  track: ActiveTrack;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
};

export function TrackHeader({
  track,
  dragHandleProps,
  className,
}: TrackHeaderProps) {
  const actions = useBrowserActions();
  const Icon = track.definition.icon;

  const handleHeightChange = (delta: number) => {
    const newHeight = track.height + delta;
    actions.setTrackHeight(track.definition.id, newHeight);
  };

  const handleRemove = () => {
    actions.removeTrack(track.definition.id);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Track icon and name */}
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {track.definition.name}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleHeightChange(-20)}
              disabled={track.height <= 50}
            >
              <Minus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Decrease height</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleHeightChange(20)}
              disabled={track.height >= 500}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Increase height</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove track</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
