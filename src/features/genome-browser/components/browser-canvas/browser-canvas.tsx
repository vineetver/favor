// src/features/genome-browser/components/browser-canvas/browser-canvas.tsx
//
// Renders the active set of tracks via Gosling.js.
//
// Responsibilities:
//   1. Read state from BrowserContext (region + visible tracks).
//   2. Build a single GoslingSpec by flattening the tracks' `specs[]`
//      arrays into one stacked view, sharing a linkingId so all tracks
//      pan/zoom together.
//   3. Mount via the lazy GoslingMount (next/dynamic, ssr:false).
//
// The spec construction lives here (not in the registry) because it
// depends on runtime state — the current region and the user's track
// selection.

'use client'

import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import type { GoslingSpec } from 'gosling.js'
import { cn } from '@infra/utils'
import { Skeleton } from '@shared/components/ui/skeleton'
import { useBrowser, useVisibleTracks } from '../../state/browser-context'
import {
  isStaticTrack,
  isDynamicTrack,
  type ActiveTrack,
  type GoslingTrackSpec,
} from '../../types/tracks'
import type { GenomicRegion } from '../../types/state'
import { LINKING_ID } from '../../tracks/constants'
import { GoslingMount } from './gosling-mount'

type BrowserCanvasProps = {
  className?: string
}

export function BrowserCanvas({ className }: BrowserCanvasProps) {
  const { state } = useBrowser()
  const visibleTracks = useVisibleTracks()

  const goslingSpec = useMemo(() => {
    if (state.status !== 'ready') return null
    if (visibleTracks.length === 0) return null
    return buildGoslingSpec(state.region, visibleTracks)
  }, [state, visibleTracks])

  if (state.status === 'idle' || state.status === 'loading') {
    return <BrowserCanvasSkeleton className={className} />
  }

  if (state.status === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-8',
          className
        )}
      >
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

  if (visibleTracks.length === 0 || !goslingSpec) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 p-8',
          className
        )}
      >
        <p className="font-medium text-foreground">No tracks selected</p>
        <p className="text-sm text-muted-foreground">
          Pick tracks from the panel on the left to visualize genomic data.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('w-full bg-background', className)}>
      <GoslingMount spec={goslingSpec} padding={8} theme="light" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEC BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construct a single GoslingSpec for the current region and active tracks.
 *
 * Track expansion rules:
 *   • Static tracks contribute every entry of their `specs` array.
 *   • Dynamic tracks call their `specFactory` once with the current region.
 *   • Composite static tracks (e.g. eQTL Overlay) end up as multiple
 *     stacked Gosling tracks under the user's single toggle.
 *
 * The cast at the bottom is the only type assertion: our internal
 * `GoslingTrackSpec` is a permissive Record shape, but the GoslingComponent
 * prop wants the real `GoslingSpec` discriminated union which gosling.js
 * doesn't expose at the track level.
 */
function buildGoslingSpec(
  region: GenomicRegion,
  tracks: readonly ActiveTrack[]
): GoslingSpec {
  const trackSpecs: GoslingTrackSpec[] = []
  const seenIds = new Set<string>()

  for (const track of tracks) {
    if (track.visibility.state !== 'visible') continue
    if (seenIds.has(track.definition.id)) continue
    seenIds.add(track.definition.id)

    if (isStaticTrack(track.definition)) {
      // Composite tracks contribute multiple stacked sub-tracks; the user's
      // height slider applies to the first one only (matches master).
      track.definition.specs.forEach((spec, index) => {
        trackSpecs.push(
          index === 0 ? { ...spec, height: track.height } : { ...spec }
        )
      })
      continue
    }

    if (isDynamicTrack(track.definition)) {
      trackSpecs.push(
        track.definition.specFactory({
          region,
          source: track.definition.source,
          height: track.height,
        })
      )
    }
  }

  // Note: do NOT set `style.background = 'transparent'` here. Gosling
  // renders into a PIXI canvas; an unset/transparent background falls back
  // to PIXI's black clearColor. Letting Gosling apply its 'light' theme
  // (passed via the GoslingMount prop) keeps the canvas white.
  const rootSpec = {
    assembly: 'hg38',
    layout: 'linear',
    arrangement: 'vertical',
    spacing: 4,
    centerRadius: 0.1,
    responsiveSize: { width: true },
    views: [
      {
        id: 'browser-main-view',
        layout: 'linear',
        alignment: 'stack',
        spacing: 0,
        linkingId: LINKING_ID,
        xDomain: {
          chromosome: region.chromosome as string,
          interval: [region.start, region.end] as [number, number],
        },
        tracks: trackSpecs,
      },
    ],
  }

  return rootSpec as unknown as GoslingSpec
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING / SKELETON
// ─────────────────────────────────────────────────────────────────────────────

export function BrowserCanvasSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col bg-background', className)}>
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
