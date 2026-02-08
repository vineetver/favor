'use client'

// src/features/genome-browser/components/track-selector/category-list.tsx
// Collapsible list of tracks grouped by category

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shared/components/ui/collapsible'
import { TooltipProvider } from '@shared/components/ui/tooltip'
import { cn } from '@infra/utils'
import type { StaticTrack, TrackCategory } from '../../types/tracks'
import { TRACK_CATEGORY_LABELS } from '../../types/tracks'
import { TrackItem } from './track-item'
import { useBrowser } from '../../state/browser-context'

type CategoryListProps = {
  tracks: Map<TrackCategory, StaticTrack[]>
  className?: string
}

export function CategoryList({ tracks, className }: CategoryListProps) {
  const { selectors, actions } = useBrowser()
  const [openCategories, setOpenCategories] = useState<Set<TrackCategory>>(
    new Set(['annotation', 'clinical'])
  )

  const toggleCategory = (category: TrackCategory) => {
    setOpenCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className={cn("space-y-1", className)}>
        {Array.from(tracks.entries()).map(([category, categoryTracks]) => {
          const isOpen = openCategories.has(category)
          const activeCount = categoryTracks.filter(t =>
            selectors.isTrackVisible(t.id)
          ).length

          return (
            <Collapsible
              key={category}
              open={isOpen}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-90"
                    )}
                  />
                  <span>{TRACK_CATEGORY_LABELS[category]}</span>
                </div>
                <span className="text-xs">
                  {activeCount > 0 && (
                    <span className="text-primary">{activeCount}/</span>
                  )}
                  {categoryTracks.length}
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent className="pl-4 space-y-0.5">
                {categoryTracks.map(track => (
                  <TrackItem
                    key={track.id}
                    track={track}
                    isActive={selectors.isTrackVisible(track.id)}
                    onToggle={() => actions.toggleTrack(track.id, track)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
