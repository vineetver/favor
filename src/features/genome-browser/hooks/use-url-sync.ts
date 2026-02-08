'use client'

// src/features/genome-browser/hooks/use-url-sync.ts
// Sync browser state with URL parameters

import { useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useBrowser } from '../state/browser-context'
import {
  parseRegionParam,
  parseTracksParam,
  formatRegion,
} from '../utils/region-parser'
import { getTrackById } from '../tracks/registry'
import { createActiveTrack } from '../types/tracks'

type UseUrlSyncOptions = {
  enabled?: boolean
}

/**
 * Syncs browser state with URL search parameters
 *
 * URL format:
 * ?region=chr17:41196312-41276312&tracks=gene-annotation,clinvar,h3k27ac
 */
export function useUrlSync(options: UseUrlSyncOptions = {}) {
  const { enabled = true } = options
  const { state, actions } = useBrowser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse URL on mount and restore state
  useEffect(() => {
    if (!enabled) return
    if (state.status !== 'ready') return

    const regionParam = searchParams.get('region')
    const tracksParam = searchParams.get('tracks')

    // Restore region from URL
    if (regionParam) {
      const parsedRegion = parseRegionParam(regionParam)
      if (parsedRegion) {
        actions.navigateTo(parsedRegion)
      }
    }

    // Restore tracks from URL
    if (tracksParam) {
      const trackIds = parseTracksParam(tracksParam)
      for (const trackId of trackIds) {
        const trackDef = getTrackById(trackId)
        if (trackDef) {
          actions.addTrack(trackDef)
        }
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Update URL when state changes
  const updateUrl = useCallback(() => {
    if (!enabled) return
    if (state.status !== 'ready') return

    const params = new URLSearchParams()

    // Add region
    params.set('region', formatRegion(state.region, { commas: false }))

    // Add visible track IDs
    const visibleTrackIds = state.tracks
      .filter(t => t.visibility.state === 'visible')
      .sort((a, b) => {
        const orderA = a.visibility.state === 'visible' ? a.visibility.order : 0
        const orderB = b.visibility.state === 'visible' ? b.visibility.order : 0
        return orderA - orderB
      })
      .map(t => t.definition.id)

    if (visibleTrackIds.length > 0) {
      params.set('tracks', visibleTrackIds.join(','))
    }

    // Update URL without triggering navigation
    const newUrl = `${pathname}?${params.toString()}`
    router.replace(newUrl, { scroll: false })
  }, [enabled, state, pathname, router])

  // Debounced URL update
  useEffect(() => {
    if (!enabled) return
    if (state.status !== 'ready') return

    const timeoutId = setTimeout(updateUrl, 300)
    return () => clearTimeout(timeoutId)
  }, [enabled, state, updateUrl])

  return { updateUrl }
}

/**
 * Generate a shareable URL for the current browser state
 */
export function useShareableUrl(): string | null {
  const { state } = useBrowser()
  const pathname = usePathname()

  if (state.status !== 'ready') return null

  const params = new URLSearchParams()
  params.set('region', formatRegion(state.region, { commas: false }))

  const visibleTrackIds = state.tracks
    .filter(t => t.visibility.state === 'visible')
    .map(t => t.definition.id)

  if (visibleTrackIds.length > 0) {
    params.set('tracks', visibleTrackIds.join(','))
  }

  // Get full URL (works on client side)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${pathname}?${params.toString()}`
  }

  return `${pathname}?${params.toString()}`
}
