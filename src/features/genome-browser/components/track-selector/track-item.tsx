"use client";

// src/features/genome-browser/components/track-selector/track-item.tsx
// Individual track toggle item

import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { DynamicTrack, StaticTrack } from "../../types/tracks";
import { TrackCheckbox } from "../shared/track-checkbox";

type TrackItemProps = {
  track: StaticTrack | DynamicTrack;
  isActive: boolean;
  onToggle: () => void;
  className?: string;
};

export function TrackItem({
  track,
  isActive,
  onToggle,
  className,
}: TrackItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
            isActive
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
            className,
          )}
        >
          <TrackCheckbox checked={isActive} />
          <span className="flex-1 text-left truncate">{track.name}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <p className="font-medium">{track.name}</p>
        <p className="text-muted-foreground text-xs">{track.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
