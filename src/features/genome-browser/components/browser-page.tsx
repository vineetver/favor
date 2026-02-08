'use client'

// src/features/genome-browser/components/browser-page.tsx
// Main genome browser page component (orchestrator)

import { useMemo, useEffect } from 'react'
import { cn } from '@infra/utils'
import { BrowserProvider } from '../state/browser-context'
import { ControlBar } from './control-bar/control-bar'
import { TrackSelector } from './track-selector/track-selector'
import { BrowserCanvas } from './browser-canvas/browser-canvas'
import { createGenomicRegion, type GenomicRegion } from '../types/state'
import { getDefaultTracks, getTrackById } from '../tracks/registry'
import { createActiveTrack, type ActiveTrack } from '../types/tracks'

type BrowserPageProps = {
  geneId?: string
  geneSymbol?: string
  chromosome?: string
  start?: number
  end?: number
  className?: string
}

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
      return createGenomicRegion(chromosome, start, end)
    }
    // Default to BRCA1 region
    return createGenomicRegion('chr17', 43044295, 43125364)
  }, [chromosome, start, end])

  // Create initial tracks from defaults
  const initialTracks = useMemo(() => {
    const defaultTrackDefs = getDefaultTracks()
    return defaultTrackDefs.map((def, index) =>
      createActiveTrack(def, index)
    )
  }, [])

  if (!initialRegion) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-destructive">Invalid genomic region specified</p>
      </div>
    )
  }

  return (
    <BrowserProvider initialRegion={initialRegion} initialTracks={initialTracks}>
      <div className={cn("flex flex-col", className)}>
        {/* Control bar */}
        <ControlBar initialRegion={initialRegion} />

        {/* Main content area */}
        <div className="flex min-h-[600px] w-full overflow-hidden">
          {/* Track selector (left panel) */}
          <TrackSelector className="w-72 shrink-0 border-r border-border" />

          {/* Browser canvas (main area) */}
          <BrowserCanvas className="flex-1 min-w-0 overflow-hidden" />
        </div>
      </div>
    </BrowserProvider>
  )
}
