"use client";

// src/features/genome-browser/components/browser-page.tsx
// Main genome browser page component (orchestrator)

import { cn } from "@infra/utils";
import { useMemo } from "react";
import { BrowserProvider } from "../state/browser-context";
import { getDefaultTracks } from "../tracks/registry";
import { createGenomicRegion } from "../types/state";
import { createActiveTrack } from "../types/tracks";
import { BrowserCanvas } from "./browser-canvas/browser-canvas";
import { ControlBar } from "./control-bar/control-bar";
import { TrackSelector } from "./track-selector/track-selector";

type BrowserPageProps = {
  geneId?: string;
  geneSymbol?: string;
  chromosome?: string;
  start?: number;
  end?: number;
  className?: string;
};

export function BrowserPage({
  geneId,
  geneSymbol,
  chromosome,
  start,
  end,
  className,
}: BrowserPageProps) {
  // Create initial region from props or use default
  const initialRegion = useMemo(() => {
    if (chromosome && start !== undefined && end !== undefined) {
      return createGenomicRegion(chromosome, start, end);
    }
    // Default to BRCA1 region
    return createGenomicRegion("chr17", 43044295, 43125364);
  }, [chromosome, start, end]);

  // Create initial tracks from defaults
  const initialTracks = useMemo(() => {
    const defaultTrackDefs = getDefaultTracks();
    return defaultTrackDefs.map((def, index) => createActiveTrack(def, index));
  }, []);

  if (!initialRegion) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-destructive">Invalid genomic region specified</p>
      </div>
    );
  }

  return (
    <BrowserProvider
      initialRegion={initialRegion}
      initialTracks={initialTracks}
    >
      <div className={cn("flex flex-col w-full", className)}>
        <ControlBar initialRegion={initialRegion} />

        {/* Main content area — grows to fill the viewport. The canvas needs
            min-w-0 so it can shrink inside the flex row; overflow on the
            row is hidden but the canvas itself lets Gosling render its
            full extent (axis labels live in the inner padding). */}
        <div className="flex w-full overflow-hidden">
          <TrackSelector className="w-72 shrink-0 border-r border-border" />
          <BrowserCanvas className="flex-1 min-w-0" />
        </div>
      </div>
    </BrowserProvider>
  );
}
