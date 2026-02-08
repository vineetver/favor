'use client'

// src/features/genome-browser/hooks/use-tissue-assays.ts
// Hook for getting available assays for a tissue/subtissue combination

import { useMemo } from 'react'
import {
  getAvailableAssays,
  getTissueById,
  getSubtissueById,
  ASSAY_LABELS,
  ASSAY_DESCRIPTIONS,
  type ValidAssayType,
  type TissueMetadata,
  type SubtissueMetadata,
} from '../types/tissue'

type AssayInfo = {
  id: ValidAssayType
  label: string
  description: string
}

type UseTissueAssaysResult = {
  assays: AssayInfo[]
  tissue: TissueMetadata | undefined
  subtissue: SubtissueMetadata | undefined
  isLoading: boolean
}

/**
 * Get available assays for a tissue/subtissue combination
 */
export function useTissueAssays(
  tissueId: string | null,
  subtissueId: string | null
): UseTissueAssaysResult {
  const result = useMemo(() => {
    if (!tissueId || !subtissueId) {
      return {
        assays: [],
        tissue: undefined,
        subtissue: undefined,
        isLoading: false,
      }
    }

    const tissue = getTissueById(tissueId)
    const subtissue = getSubtissueById(tissueId, subtissueId)
    const availableAssays = getAvailableAssays(tissueId, subtissueId)

    const assayInfos: AssayInfo[] = availableAssays.map(assayType => ({
      id: assayType,
      label: ASSAY_LABELS[assayType],
      description: ASSAY_DESCRIPTIONS[assayType],
    }))

    return {
      assays: assayInfos,
      tissue,
      subtissue,
      isLoading: false,
    }
  }, [tissueId, subtissueId])

  return result
}

/**
 * Get all subtissues for a tissue
 */
export function useTissueSubtissues(tissueId: string | null): SubtissueMetadata[] {
  return useMemo(() => {
    if (!tissueId) return []
    const tissue = getTissueById(tissueId)
    return tissue?.subtissues ?? []
  }, [tissueId])
}
