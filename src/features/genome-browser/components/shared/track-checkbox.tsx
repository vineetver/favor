'use client'

// src/features/genome-browser/components/shared/track-checkbox.tsx
// Custom checkbox indicator for track selection

import { Check } from 'lucide-react'
import { cn } from '@infra/utils'

type TrackCheckboxProps = {
  checked: boolean
  className?: string
}

export function TrackCheckbox({ checked, className }: TrackCheckboxProps) {
  return (
    <div
      className={cn(
        "h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors",
        checked
          ? "bg-primary border-primary text-primary-foreground"
          : "border-input bg-background",
        className
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </div>
  )
}
