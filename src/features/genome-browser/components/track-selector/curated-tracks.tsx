'use client'

// src/features/genome-browser/components/track-selector/curated-tracks.tsx
// Curated (starred) tracks section

import { Star } from 'lucide-react'
import { TooltipProvider } from '@shared/components/ui/tooltip'
import { cn } from '@infra/utils'
import { getCuratedTracks } from '../../tracks/registry'
import { TrackItem } from './track-item'
import {
  useBrowserActions,
  useVisibleTrackIds,
} from '../../state/browser-context'

type CuratedTracksProps = {
  className?: string
}

const CURATED_TRACKS = getCuratedTracks()

export function CuratedTracks({ className }: CuratedTracksProps) {
  const visibleIds = useVisibleTrackIds()
  const actions = useBrowserActions()
  const curatedTracks = CURATED_TRACKS

  if (curatedTracks.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        <span className="text-sm font-medium text-muted-foreground">Curated</span>
      </div>
      <TooltipProvider delayDuration={400}>
        <div className="space-y-0.5">
          {curatedTracks.map(track => (
            <TrackItem
              key={track.id}
              track={track}
              isActive={visibleIds.has(track.id)}
              onToggle={() => actions.toggleTrack(track.id, track)}
            />
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}
