'use client'

// src/features/genome-browser/hooks/use-tissue-selection.ts
//
// Stateless helpers for toggling tissue-specific dynamic tracks.
//
// All callbacks have empty dep arrays — they read from the precomputed
// `visibleTrackIds` Set in BrowserStateContext (O(1) lookups) and call
// stable action creators from BrowserActionsContext.
//
// `activeTissueTracks` is derived from the visible-tracks list and is
// memoized at the provider level, so subscribing to it does NOT cause
// the picker to re-render when an unrelated track is toggled.

import { useCallback, useMemo } from 'react'
import {
  useBrowserActions,
  useVisibleTracks,
  useVisibleTrackIds,
} from '../state/browser-context'
import { isDynamicTrack } from '../types/tracks'
import { createTissueSource } from '../types/tissue'
import {
  createTissueTrack,
  tissueTrackId,
} from '../tracks/dynamic/tissue-track'

export type ActiveTissueTrack = {
  readonly id: string
  readonly tissue: string
  readonly subtissue: string
  readonly assay: string
}

export function useTissueTracks() {
  const visibleTracks = useVisibleTracks()
  const visibleTrackIds = useVisibleTrackIds()
  const actions = useBrowserActions()

  const activeTissueTracks = useMemo<readonly ActiveTissueTrack[]>(() => {
    const out: ActiveTissueTrack[] = []
    for (const t of visibleTracks) {
      if (!isDynamicTrack(t.definition)) continue
      out.push({
        id: t.definition.id,
        tissue: t.definition.source.tissue as string,
        subtissue: t.definition.source.subtissue as string,
        assay: t.definition.source.assay as string,
      })
    }
    return out
  }, [visibleTracks])

  const isAssayActive = useCallback(
    (tissue: string, subtissue: string, assay: string): boolean => {
      const source = createTissueSource(tissue, subtissue, assay)
      if (!source) return false
      return visibleTrackIds.has(tissueTrackId(source))
    },
    [visibleTrackIds]
  )

  const toggleAssay = useCallback(
    (tissue: string, subtissue: string, assay: string) => {
      const source = createTissueSource(tissue, subtissue, assay)
      if (!source) return
      const id = tissueTrackId(source)
      if (visibleTrackIds.has(id)) {
        actions.removeTrack(id)
        return
      }
      actions.addTissueTrack(createTissueTrack(source), source)
    },
    [actions, visibleTrackIds]
  )

  const removeById = useCallback(
    (id: string) => {
      actions.removeTrack(id)
    },
    [actions]
  )

  const clearAll = useCallback(() => {
    for (const t of activeTissueTracks) {
      actions.removeTrack(t.id)
    }
  }, [actions, activeTissueTracks])

  return {
    activeTissueTracks,
    isAssayActive,
    toggleAssay,
    removeById,
    clearAll,
  }
}
