'use client'

// src/features/genome-browser/components/browser-canvas/browser-canvas.tsx
// Main canvas displaying Gosling tracks

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@shared/components/ui/skeleton'
import { cn } from '@infra/utils'
import { useBrowser, useVisibleTracks } from '../../state/browser-context'
import type { GoslingSpec, GoslingTrackSpec, ActiveTrack } from '../../types/tracks'
import type { GenomicRegion } from '../../types/state'
import { isStaticTrack, isDynamicTrack } from '../../types/tracks'
import { LINKING_ID } from '../../tracks/static/gene-annotation'

// Dynamically import Gosling to avoid SSR issues
const GoslingComponent = dynamic(
  () => import('gosling.js').then(mod => mod.GoslingComponent),
  {
    ssr: false,
    loading: () => <GoslingLoadingState />,
  }
)

type BrowserCanvasProps = {
  className?: string
}

export function BrowserCanvas({ className }: BrowserCanvasProps) {
  const { state } = useBrowser()
  const visibleTracks = useVisibleTracks()

  // Build Gosling spec from active tracks
  const goslingSpec = useMemo(() => {
    if (state.status !== 'ready' || visibleTracks.length === 0) return null
    return buildGoslingSpec(state.region, visibleTracks)
  }, [state, visibleTracks])

  if (state.status === 'idle' || state.status === 'loading') {
    return <BrowserCanvasSkeleton className={className} />
  }

  if (state.status === 'error') {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium text-foreground">{state.error.message}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please try refreshing the page or selecting a different region.
          </p>
        </div>
      </div>
    )
  }

  if (visibleTracks.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
        <div className="text-center">
          <p className="font-medium text-foreground">No tracks selected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Select tracks from the panel on the left to visualize genomic data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full h-full bg-background", className)}>
      {goslingSpec ? (
        <GoslingComponent
          spec={goslingSpec}
          padding={0}
        />
      ) : (
        <GoslingLoadingState />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GOSLING SPEC BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildGoslingSpec(
  region: GenomicRegion,
  tracks: ActiveTrack[]
): GoslingSpec {
  const trackSpecs: GoslingTrackSpec[] = []
  const seenIds = new Set<string>()

  for (const track of tracks) {
    if (track.visibility.state !== 'visible') continue

    // Ensure no duplicate tracks
    if (seenIds.has(track.definition.id)) continue
    seenIds.add(track.definition.id)

    if (isStaticTrack(track.definition)) {
      // Keep the spec as-is with height override
      // Gosling will handle responsive sizing based on container width
      trackSpecs.push({
        ...track.definition.spec,
        height: track.height,
      })
    } else if (isDynamicTrack(track.definition)) {
      trackSpecs.push(track.definition.specFactory({
        region,
        source: track.definition.source,
        height: track.height,
      }))
    }
  }

  return {
    assembly: 'hg38',
    xDomain: {
      chromosome: region.chromosome as string,
      interval: [region.start, region.end],
    },
    views: [
      {
        linkingId: LINKING_ID,
        alignment: 'stack',
        tracks: trackSpecs,
      },
    ],
    style: {
      background: 'white',
      outlineWidth: 0,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING STATES
// ─────────────────────────────────────────────────────────────────────────────

function GoslingLoadingState() {
  return (
    <div className="flex items-center justify-center p-12 h-full">
      <div className="text-center space-y-3">
        <div className="animate-pulse">
          <Skeleton className="h-8 w-48 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground">Loading genome browser...</p>
      </div>
    </div>
  )
}

function BrowserCanvasSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col bg-background", className)}>
      <div className="p-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { BrowserCanvasSkeleton }
