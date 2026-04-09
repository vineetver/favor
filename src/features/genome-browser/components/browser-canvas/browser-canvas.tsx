'use client'

// src/features/genome-browser/components/browser-canvas/browser-canvas.tsx
//
// Renders the active set of tracks via Gosling.js.
//
// Subscriptions are deliberately narrow: just the region and the visible-track
// list. Track height edits and reorders go through `visibleTracks` (a stable
// reference until something inside actually changes), so the spec is rebuilt
// only when something the canvas cares about has moved.

import { useMemo } from 'react'
import type { GoslingSpec } from 'gosling.js'
import { cn } from '@infra/utils'
import { Skeleton } from '@shared/components/ui/skeleton'
import {
  useBrowserRegion,
  useVisibleTracks,
} from '../../state/browser-context'
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
  const region = useBrowserRegion()
  const visibleTracks = useVisibleTracks()

  const goslingSpec = useMemo<GoslingSpec | null>(() => {
    if (!region || visibleTracks.length === 0) return null
    return buildGoslingSpec(region, visibleTracks)
  }, [region, visibleTracks])

  if (!region) {
    return <BrowserCanvasSkeleton className={className} />
  }

  if (visibleTracks.length === 0 || !goslingSpec) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 p-8',
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
 * The `as unknown as GoslingSpec` cast at the bottom is the only type
 * assertion in this file: our internal `GoslingTrackSpec` is a permissive
 * Record shape because Gosling's track-level types are not exported from
 * the package root.
 */
function buildGoslingSpec(
  region: GenomicRegion,
  tracks: readonly ActiveTrack[]
): GoslingSpec {
  const trackSpecs: GoslingTrackSpec[] = []

  for (const track of tracks) {
    if (isStaticTrack(track.definition)) {
      // Composite static tracks contribute several stacked sub-tracks. The
      // user's height slider applies to the first one only (matches master).
      const specs = track.definition.specs
      for (let i = 0; i < specs.length; i++) {
        trackSpecs.push(
          i === 0 ? { ...specs[i], height: track.height } : { ...specs[i] }
        )
      }
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

  // Note: do NOT set `style.background = 'transparent'` here. Gosling renders
  // into a PIXI canvas; an unset/transparent background falls back to PIXI's
  // black clearColor. The 'light' theme passed via GoslingMount keeps the
  // canvas white.
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
// SKELETON
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
