"use client";

// src/features/genome-browser/components/browser-canvas/track-list.tsx
// Sortable list of tracks with drag-and-drop

import { cn } from "@infra/utils";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { useCallback, useState } from "react";
import {
  useBrowserActions,
  useVisibleTracks,
} from "../../state/browser-context";
import { TrackHeader } from "./track-header";

type TrackListProps = {
  className?: string;
};

export function TrackList({ className }: TrackListProps) {
  const visibleTracks = useVisibleTracks();
  const actions = useBrowserActions();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedIndex],
  );

  const handleDragEnd = useCallback(() => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      actions.reorderTracks(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, actions]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  if (visibleTracks.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("divide-y divide-border", className)}>
        {visibleTracks.map((track, index) => (
          <div
            key={track.definition.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            className={cn(
              "group relative transition-opacity",
              draggedIndex === index && "opacity-50",
              dragOverIndex === index && "ring-2 ring-primary ring-inset",
            )}
          >
            <TrackHeader
              track={track}
              dragHandleProps={{
                onMouseDown: (e) => e.stopPropagation(),
              }}
            />
            {/* Track content placeholder - actual rendering is in Gosling */}
            <div className="bg-background" style={{ height: track.height }}>
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                {track.definition.name} ({track.height}px)
              </div>
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
