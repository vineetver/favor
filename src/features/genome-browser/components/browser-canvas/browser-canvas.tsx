'use client'

// src/features/genome-browser/components/browser-canvas/browser-canvas.tsx
//
// Renders the active set of tracks via Gosling.js.
//
// Sizing strategy:
//   We measure our wrapper element with a ResizeObserver and inject the
//   measured pixel width directly into the Gosling spec at every track plus
//   the root view. We do NOT rely on Gosling's `responsiveSize: { width: true }`
//   in v2-alpha — under React 19 the dynamic-import wrapper measures the
//   parent at zero-width before the layout pass settles, and the canvas
//   never re-fits. Driving width imperatively from a ResizeObserver gives
//   us a deterministic single source of truth for the rendered width.
//
// Re-render budget:
//   Subscriptions are deliberately narrow: just the region and the visible-
//   track list (precomputed by BrowserStateContext). Width changes drive a
//   spec rebuild via useMemo([region, visibleTracks, width]) — that's the
//   only path that should trigger a Gosling re-render, and it's exactly
//   what should trigger one.

import { useEffect, useMemo, useRef, useState } from 'react'
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

const GOSLING_INNER_PADDING = 24

export function BrowserCanvas({ className }: BrowserCanvasProps) {
  const region = useBrowserRegion()
  const visibleTracks = useVisibleTracks()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const width = useContainerWidth(wrapperRef)

  const goslingSpec = useMemo<GoslingSpec | null>(() => {
    if (!region || visibleTracks.length === 0 || width === null) return null
    return buildGoslingSpec(region, visibleTracks, width)
  }, [region, visibleTracks, width])

  if (!region) {
    return <BrowserCanvasSkeleton className={className} />
  }

  if (visibleTracks.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[480px] flex-col items-center justify-center gap-2 p-8',
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
    <div
      ref={wrapperRef}
      className={cn('w-full min-w-0 bg-background', className)}
    >
      {goslingSpec && (
        <GoslingMount
          spec={goslingSpec}
          padding={GOSLING_INNER_PADDING}
          theme="light"
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTAINER WIDTH HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track the offsetWidth of an element via ResizeObserver. Returns null on
 * the very first render so consumers can defer rendering until a real
 * measurement is available (avoids a flash of zero-width Gosling).
 */
function useContainerWidth(
  ref: React.RefObject<HTMLDivElement | null>
): number | null {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Initial measurement before the observer fires.
    setWidth(node.offsetWidth)

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const next = Math.floor(entry.contentRect.width)
        if (next > 0) setWidth(next)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return width
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEC BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construct a single GoslingSpec for the current region, active tracks, and
 * measured container width.
 *
 * Track expansion rules:
 *   • Static tracks contribute every entry of their `specs` array. Per-track
 *     `width` properties from the static catalog are dropped — width is
 *     driven exclusively by the measured container.
 *   • Dynamic tracks call their `specFactory` once with the current region.
 *   • Composite static tracks (e.g. eQTL Overlay) end up as multiple stacked
 *     Gosling tracks under the user's single toggle.
 *
 * The `as unknown as GoslingSpec` cast at the bottom is the only type
 * assertion in this file: our internal `GoslingTrackSpec` is a permissive
 * Record shape because Gosling's track-level types are not exported from
 * the package root.
 */
function buildGoslingSpec(
  region: GenomicRegion,
  tracks: readonly ActiveTrack[],
  containerWidth: number
): GoslingSpec {
  // Gosling's `padding` prop reserves whitespace inside the canvas border.
  // Subtract twice that from the measured width so the plotted area lands
  // exactly on the container edges.
  const plottedWidth = Math.max(
    100,
    containerWidth - GOSLING_INNER_PADDING * 2
  )

  const trackSpecs: GoslingTrackSpec[] = []

  for (const track of tracks) {
    if (isStaticTrack(track.definition)) {
      const specs = track.definition.specs
      for (let i = 0; i < specs.length; i++) {
        // Strip per-track `width` so the catalog can carry sensible defaults
        // without overriding the responsive layout. `height` is the only
        // dimension we honor from the spec; the user's slider drives the
        // first sub-track of composite specs.
        const { width: _ignoredWidth, ...rest } = specs[i] as GoslingTrackSpec & {
          width?: number
        }
        trackSpecs.push(
          i === 0
            ? { ...rest, width: plottedWidth, height: track.height }
            : { ...rest, width: plottedWidth }
        )
      }
      continue
    }

    if (isDynamicTrack(track.definition)) {
      const dynamicSpec = track.definition.specFactory({
        region,
        source: track.definition.source,
        height: track.height,
      })
      const { width: _ignoredWidth, ...rest } = dynamicSpec as GoslingTrackSpec & {
        width?: number
      }
      trackSpecs.push({ ...rest, width: plottedWidth })
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
    views: [
      {
        id: 'browser-main-view',
        layout: 'linear',
        alignment: 'stack',
        spacing: 0,
        linkingId: LINKING_ID,
        width: plottedWidth,
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
