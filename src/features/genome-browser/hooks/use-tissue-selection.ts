'use client'

// src/features/genome-browser/hooks/use-tissue-selection.ts
//
// Stateless helpers for toggling tissue-specific dynamic tracks.
//
// The picker UI manages its own filter state (tissue / assay / search). This
// hook exposes only the small mutation-and-query surface that talks to the
// browser context, so the picker stays a pure presentation component.

import { useCallback, useMemo } from 'react'
import { createTissueSource } from '../types/tissue'
import { createTissueTrack, tissueTrackId } from '../tracks/dynamic/tissue-track'
import { useBrowser } from '../state/browser-context'
import { isDynamicTrack, type ActiveTrack } from '../types/tracks'

export type ActiveTissueTrack = {
  id: string
  tissue: string
  subtissue: string
  assay: string
}

export function useTissueTracks() {
  const { state, actions, selectors } = useBrowser()

  /**
   * Active dynamic (tissue) tracks, exposed in selection-friendly form so
   * the picker can render the "selected pills" row without poking at the
   * full TrackDefinition union.
   */
  const activeTissueTracks = useMemo<ActiveTissueTrack[]>(() => {
    if (state.status !== 'ready') return []
    return state.tracks
      .filter(
        (t): t is ActiveTrack & { definition: ReturnType<typeof createTissueTrack> } =>
          isDynamicTrack(t.definition)
      )
      .filter(t => t.visibility.state === 'visible')
      .map(t => ({
        id: t.definition.id,
        tissue: t.definition.source.tissue as string,
        subtissue: t.definition.source.subtissue as string,
        assay: t.definition.source.assay as string,
      }))
  }, [state])

  const isAssayActive = useCallback(
    (tissue: string, subtissue: string, assay: string): boolean => {
      const source = createTissueSource(tissue, subtissue, assay)
      if (!source) return false
      return selectors.isTrackVisible(tissueTrackId(source))
    },
    [selectors]
  )

  const toggleAssay = useCallback(
    (tissue: string, subtissue: string, assay: string) => {
      const source = createTissueSource(tissue, subtissue, assay)
      if (!source) return
      const id = tissueTrackId(source)
      if (selectors.isTrackVisible(id)) {
        actions.removeTrack(id)
        return
      }
      const track = createTissueTrack(source)
      actions.addTissueTrack(track, source)
    },
    [actions, selectors]
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
  }, [activeTissueTracks, actions])

  return {
    activeTissueTracks,
    isAssayActive,
    toggleAssay,
    removeById,
    clearAll,
  }
}
