'use client'

// src/features/genome-browser/components/track-selector/tissue-selector.tsx
//
// Sidebar entry that opens the full tissue picker.
// The actual UI lives in tissue-picker.tsx so the sidebar stays compact.

import { TissuePickerTrigger } from './tissue-picker'

export function TissueSelector({ className }: { className?: string }) {
  return <TissuePickerTrigger className={className} />
}
