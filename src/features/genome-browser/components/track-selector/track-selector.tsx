'use client'

// src/features/genome-browser/components/track-selector/track-selector.tsx
// Left panel for track selection

import { useState, useMemo } from 'react'
import { Badge } from '@shared/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs'
import { Skeleton } from '@shared/components/ui/skeleton'
import { cn } from '@infra/utils'
import { useBrowserState, useVisibleTrackCount } from '../../state/browser-context'
import { getTracksGroupedByCategory, getAllTracks } from '../../tracks/registry'
import type { StaticTrack, TrackCategory } from '../../types/tracks'
import { SearchTracks } from './search-tracks'
import { CategoryList } from './category-list'
import { TissueSelector } from './tissue-selector'
import { CollectionsList } from './collections-list'

type TrackSelectorProps = {
  className?: string
}

// Cached registry slices — these never change at runtime, so we lift them
// out of the component entirely. Otherwise every render re-creates the Map.
const ALL_TRACKS_GROUPED = getTracksGroupedByCategory()
const ALL_TRACKS_COUNT = getAllTracks().length

export function TrackSelector({ className }: TrackSelectorProps) {
  const state = useBrowserState()
  const visibleCount = useVisibleTrackCount()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'individual' | 'collections'>('individual')

  // Filter tracks based on search
  const filteredTracksGrouped = useMemo(() => {
    if (!search.trim()) return ALL_TRACKS_GROUPED

    const searchLower = search.toLowerCase()
    const filtered = new Map<TrackCategory, StaticTrack[]>()

    for (const [category, tracks] of ALL_TRACKS_GROUPED) {
      const matchingTracks = tracks.filter(
        track =>
          track.name.toLowerCase().includes(searchLower) ||
          track.description.toLowerCase().includes(searchLower)
      )
      if (matchingTracks.length > 0) {
        filtered.set(category, matchingTracks)
      }
    }

    return filtered
  }, [search])

  if (state.status === 'idle') {
    return <TrackSelectorSkeleton className={className} />
  }

  return (
    <div className={cn("flex flex-col bg-muted/30", className)}>
      {/* Header with track count */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <span className="font-semibold text-foreground">Tracks</span>
        <Badge variant="secondary" className="text-xs">
          {visibleCount}/{ALL_TRACKS_COUNT}
        </Badge>
      </div>

      {/* Search */}
      <div className="p-4 pb-2">
        <SearchTracks value={search} onChange={setSearch} />
      </div>

      {/* Tab toggle: Individual / Collections */}
      <div className="px-4 pb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'individual' | 'collections')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content — grows naturally with the page, no inner scroll cap */}
      <div className="p-2">
        {activeTab === 'individual' ? (
          <>
            {/* Category list */}
            <CategoryList tracks={filteredTracksGrouped} />

            {/* Divider before tissue section */}
            <div className="flex items-center gap-2 px-3 py-4">
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Tissue-specific tracks — opens the side-panel picker */}
            <div className="px-1">
              <TissueSelector />
            </div>
          </>
        ) : (
          <CollectionsList />
        )}
      </div>
    </div>
  )
}

function TrackSelectorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col bg-muted/30", className)}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="p-4">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="px-4 pb-2">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="p-4 space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export { TrackSelectorSkeleton }
