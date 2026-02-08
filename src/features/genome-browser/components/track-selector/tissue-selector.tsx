'use client'

// src/features/genome-browser/components/track-selector/tissue-selector.tsx
// Tissue/subtissue/assay selection for dynamic track creation

import { FlaskConical } from 'lucide-react'
import { Label } from '@shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@shared/components/ui/select'
import { cn } from '@infra/utils'
import { TISSUE_GROUPS, ASSAY_LABELS } from '../../types/tissue'
import { useTissueSelection } from '../../hooks/use-tissue-selection'
import { TrackCheckbox } from '../shared/track-checkbox'

type TissueSelectorProps = {
  className?: string
}

export function TissueSelector({ className }: TissueSelectorProps) {
  const {
    tissue,
    subtissue,
    subtissues,
    availableAssays,
    handleTissueChange,
    handleSubtissueChange,
    isAssayActive,
    toggleAssay,
  } = useTissueSelection()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FlaskConical className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Tissue-Specific</span>
      </div>

      <div className="px-3 space-y-3">
        {/* Tissue dropdown */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tissue</Label>
          <Select value={tissue ?? undefined} onValueChange={handleTissueChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select tissue" />
            </SelectTrigger>
            <SelectContent>
              {TISSUE_GROUPS.map(group => (
                <SelectGroup key={group.id}>
                  <SelectLabel className="text-xs font-medium text-muted-foreground">
                    {group.name}
                  </SelectLabel>
                  {group.tissues.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subtissue dropdown (only if tissue selected) */}
        {tissue && subtissues.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cell Type</Label>
            <Select value={subtissue ?? undefined} onValueChange={handleSubtissueChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select cell type" />
              </SelectTrigger>
              <SelectContent>
                {subtissues.map(st => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Available assays (checkboxes) */}
        {subtissue && availableAssays.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Available Assays</Label>
            <div className="space-y-1">
              {availableAssays.map(assay => {
                const isActive = isAssayActive(assay)
                return (
                  <div
                    key={assay}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleAssay(assay)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleAssay(assay)
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <TrackCheckbox checked={isActive} />
                    <span className="flex-1 text-left">{ASSAY_LABELS[assay]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!tissue && (
          <p className="text-xs text-muted-foreground px-3">
            Select a tissue to view available epigenomic tracks.
          </p>
        )}
      </div>
    </div>
  )
}
