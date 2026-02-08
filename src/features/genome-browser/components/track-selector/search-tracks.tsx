'use client'

// src/features/genome-browser/components/track-selector/search-tracks.tsx
// Search input for filtering tracks

import { Search, X } from 'lucide-react'
import { Input } from '@shared/components/ui/input'
import { Button } from '@shared/components/ui/button'
import { cn } from '@infra/utils'

type SearchTracksProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

export function SearchTracks({
  value,
  onChange,
  className,
  placeholder = 'Search tracks...',
}: SearchTracksProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-9"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
