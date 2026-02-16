"use client";

// src/features/genome-browser/hooks/use-tissue-selection.ts
// Hook for managing tissue/subtissue/assay selection state

import { useState, useMemo, useCallback } from 'react'
import {
  getTissueById,
  getSubtissueById,
  type ValidAssayType,
} from '../types/tissue'
import { createTissueTrack } from '../tracks/dynamic/tissue-track'
import { useBrowser } from '../state/browser-context'

export function useTissueSelection() {
  const { actions, selectors } = useBrowser()
  const [tissue, setTissue] = useState<string | null>(null)
  const [subtissue, setSubtissue] = useState<string | null>(null)

  // Get subtissues for selected tissue
  const subtissues = useMemo(() => {
    if (!tissue) return []
    const tissueData = getTissueById(tissue)
    return tissueData?.subtissues ?? []
  }, [tissue])

  // Get available assays for selected subtissue
  const availableAssays = useMemo(() => {
    if (!tissue || !subtissue) return []
    const subtissueData = getSubtissueById(tissue, subtissue)
    return subtissueData?.availableAssays ?? []
  }, [tissue, subtissue])

  // Handle tissue change - reset subtissue
  const handleTissueChange = useCallback((value: string) => {
    setTissue(value)
    setSubtissue(null)
  }, [])

  // Handle subtissue change
  const handleSubtissueChange = useCallback((value: string) => {
    setSubtissue(value)
  }, [])

  // Check if assay is active
  const isAssayActive = useCallback((assay: ValidAssayType): boolean => {
    if (!tissue || !subtissue) return false
    const trackId = `${tissue}-${subtissue}-${assay}`
    return selectors.isTrackVisible(trackId)
  }, [tissue, subtissue, selectors])

  // Toggle assay track
  const toggleAssay = useCallback((assay: ValidAssayType) => {
    if (!tissue || !subtissue) return

    const trackId = `${tissue}-${subtissue}-${assay}`
    const isActive = selectors.isTrackVisible(trackId)

    if (isActive) {
      actions.removeTrack(trackId)
    } else {
      const source = {
        tissue: tissue as any,
        subtissue: subtissue as any,
        assay: assay as any,
      }
      const trackDef = createTissueTrack(source)
      actions.addTissueTrack(trackDef, source)
    }
  }, [tissue, subtissue, actions, selectors])

  return {
    tissue,
    subtissue,
    subtissues,
    availableAssays,
    handleTissueChange,
    handleSubtissueChange,
    isAssayActive,
    toggleAssay,
  }
}
