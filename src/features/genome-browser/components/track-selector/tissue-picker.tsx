'use client'

// src/features/genome-browser/components/track-selector/tissue-picker.tsx
//
// Sheet-based tissue track picker.
//
// Design goals (vs. the old slop):
//   • Side panel, not modal — the genome browser stays visible behind it
//     so the user sees what they're adding tracks to.
//   • Single flat scroll list — no nested accordions. Each row is one
//     subtissue with all renderable assays as inline toggleable colored
//     chips, so adding/removing a track is one click, not three.
//   • Filter rail at the top — tissue chips and assay chips, both with
//     live counts. Plus a free-text search over subtissue display names.
//   • Active selection rail — currently active tissue tracks shown as
//     removable pills above the list, so the user always sees what they
//     have without scrolling.
//   • Default scope is one tissue at a time. Showing 742 subtissues at
//     once is overwhelming and slow; the first tissue auto-selects.
//
// State ownership:
//   • Filter / search state lives in this component (transient UI state).
//   • Selection state lives in BrowserContext via useTissueTracks().

import { useMemo, useState, useCallback, type ReactNode } from 'react'
import { Check, FlaskConical, Search, X } from 'lucide-react'
import { cn } from '@infra/utils'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@shared/components/ui/sheet'
import { ScrollArea } from '@shared/components/ui/scroll-area'
import { Badge } from '@shared/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@shared/components/ui/tooltip'
import {
  TissueConfig,
  type SubtissueInfo,
  type AssayInfo,
} from '../../config/tissue-config'
import {
  assayColor,
  assayLabel,
  formatSubtissue,
  listTissues,
} from '../../types/tissue'
import { useTissueTracks } from '../../hooks/use-tissue-selection'

// ─────────────────────────────────────────────────────────────────────────────
// PRECOMPUTED INDICES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Built once at module load. Maps tissue → all subtissues that have at
 * least one renderable (bigwig-backed) assay, plus the per-tissue assay
 * coverage so the assay-filter chips know what to show.
 */
type TissueIndex = {
  tissue: string
  subtissues: SubtissueInfo[]
  assayCoverage: Set<string>
  totalRenderableTracks: number
}

const TISSUE_INDEX: TissueIndex[] = listTissues().map(tissue => {
  const allSubs = TissueConfig[tissue] ?? []
  const subtissues = allSubs.filter(s => s.assays.some(a => Boolean(a.bigwig)))
  const assayCoverage = new Set<string>()
  let total = 0
  for (const sub of subtissues) {
    for (const assay of sub.assays) {
      if (assay.bigwig) {
        assayCoverage.add(assay.name)
        total += 1
      }
    }
  }
  return {
    tissue,
    subtissues,
    assayCoverage,
    totalRenderableTracks: total,
  }
})

const TOTAL_RENDERABLE_TRACKS = TISSUE_INDEX.reduce(
  (acc, t) => acc + t.totalRenderableTracks,
  0
)

const ALL_ASSAYS: string[] = (() => {
  const set = new Set<string>()
  for (const t of TISSUE_INDEX) {
    for (const a of t.assayCoverage) set.add(a)
  }
  return Array.from(set).sort()
})()

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TRIGGER (button shown in the sidebar)
// ─────────────────────────────────────────────────────────────────────────────

type TissuePickerTriggerProps = {
  className?: string
}

export function TissuePickerTrigger({ className }: TissuePickerTriggerProps) {
  const [open, setOpen] = useState(false)
  const { activeTissueTracks } = useTissueTracks()
  const activeCount = activeTissueTracks.length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                Tissue-specific tracks
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {TOTAL_RENDERABLE_TRACKS.toLocaleString()} signals across{' '}
                {TISSUE_INDEX.length} tissues
              </div>
            </div>
          </div>
          {activeCount > 0 && (
            <Badge variant="default" className="shrink-0 tabular-nums">
              {activeCount}
            </Badge>
          )}
        </button>
      </SheetTrigger>
      <TissuePickerContent />
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKER BODY
// ─────────────────────────────────────────────────────────────────────────────

function TissuePickerContent() {
  const {
    activeTissueTracks,
    isAssayActive,
    toggleAssay,
    removeById,
    clearAll,
  } = useTissueTracks()

  const [tissueFilter, setTissueFilter] = useState<string>(
    TISSUE_INDEX[0]?.tissue ?? ''
  )
  const [assayFilter, setAssayFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const currentTissue = useMemo(
    () => TISSUE_INDEX.find(t => t.tissue === tissueFilter),
    [tissueFilter]
  )

  // Subtissues filtered by search and (optionally) by assay availability.
  // We do this synchronously — even at 742 subtissues × 6 tissues this is
  // sub-millisecond on a modern machine.
  const filteredSubtissues = useMemo(() => {
    if (!currentTissue) return [] as SubtissueInfo[]
    const q = search.trim().toLowerCase()
    return currentTissue.subtissues.filter(sub => {
      if (q && !sub.name.toLowerCase().includes(q)) return false
      if (assayFilter) {
        const hasAssay = sub.assays.some(
          a => a.name === assayFilter && Boolean(a.bigwig)
        )
        if (!hasAssay) return false
      }
      return true
    })
  }, [currentTissue, search, assayFilter])

  return (
    <SheetContent
      side="right"
      showOverlay={false}
      className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
    >
      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <SheetTitle className="text-left">
              Tissue-specific tracks
            </SheetTitle>
            <SheetDescription className="text-left">
              {TOTAL_RENDERABLE_TRACKS.toLocaleString()} epigenomic signals
              across {TISSUE_INDEX.length} tissues — toggle any combination.
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      {/* Active selection rail */}
      {activeTissueTracks.length > 0 && (
        <div className="px-6 pt-4 pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-muted-foreground">
              Active ({activeTissueTracks.length})
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeTissueTracks.map(t => (
              <ActivePill
                key={t.id}
                tissue={t.tissue}
                subtissue={t.subtissue}
                assay={t.assay}
                onRemove={() => removeById(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="px-6 pt-4 pb-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={`Search ${currentTissue?.subtissues.length ?? 0} ${currentTissue?.tissue ?? ''} samples…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Tissue filter chips */}
      <FilterChipRow
        label="Tissue"
        items={TISSUE_INDEX.map(t => ({
          id: t.tissue,
          label: t.tissue,
          count: t.totalRenderableTracks,
        }))}
        value={tissueFilter}
        onChange={id => {
          setTissueFilter(id)
          setSearch('')
        }}
      />

      {/* Assay filter chips */}
      <FilterChipRow
        label="Assay"
        items={[
          { id: '__all', label: 'All', count: undefined },
          ...ALL_ASSAYS.filter(a =>
            currentTissue?.assayCoverage.has(a) ?? false
          ).map(a => ({
            id: a,
            label: assayLabel(a),
            count: undefined,
            color: assayColor(a),
          })),
        ]}
        value={assayFilter ?? '__all'}
        onChange={id => setAssayFilter(id === '__all' ? null : id)}
      />

      {/* Subtissue list */}
      <div className="flex items-center justify-between px-6 pt-3 pb-2 text-xs text-muted-foreground">
        <span>
          {filteredSubtissues.length.toLocaleString()} sample
          {filteredSubtissues.length === 1 ? '' : 's'}
          {currentTissue && ` in ${currentTissue.tissue}`}
        </span>
        {(search || assayFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setAssayFilter(null)
            }}
            className="text-primary hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 pb-6">
          {filteredSubtissues.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No samples match these filters.
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredSubtissues.map(sub => (
                <SubtissueRow
                  key={sub.name}
                  subtissue={sub}
                  tissue={currentTissue!.tissue}
                  assayFilter={assayFilter}
                  isAssayActive={isAssayActive}
                  onToggle={toggleAssay}
                />
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </SheetContent>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBTISSUE ROW
// ─────────────────────────────────────────────────────────────────────────────

type SubtissueRowProps = {
  subtissue: SubtissueInfo
  tissue: string
  assayFilter: string | null
  isAssayActive: (tissue: string, subtissue: string, assay: string) => boolean
  onToggle: (tissue: string, subtissue: string, assay: string) => void
}

function SubtissueRow({
  subtissue,
  tissue,
  assayFilter,
  isAssayActive,
  onToggle,
}: SubtissueRowProps) {
  const renderable = subtissue.assays.filter(
    (a): a is AssayInfo & { bigwig: string } => Boolean(a.bigwig)
  )
  const visible = assayFilter
    ? renderable.filter(a => a.name === assayFilter)
    : renderable

  if (visible.length === 0) return null

  return (
    <li className="group rounded-lg border border-transparent px-3 py-2.5 hover:border-border hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-snug text-foreground">
            {formatSubtissue(subtissue.name)}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {visible.map(assay => {
          const active = isAssayActive(tissue, subtissue.name, assay.name)
          return (
            <AssayChip
              key={assay.name}
              assayName={assay.name}
              active={active}
              onClick={() => onToggle(tissue, subtissue.name, assay.name)}
            />
          )
        })}
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHIP PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

type AssayChipProps = {
  assayName: string
  active: boolean
  onClick: () => void
}

function AssayChip({ assayName, active, onClick }: AssayChipProps) {
  const color = assayColor(assayName)
  const label = assayLabel(assayName)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
        active
          ? 'border-transparent text-white shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
      )}
      style={
        active
          ? { backgroundColor: color }
          : { color: undefined }
      }
      aria-pressed={active}
    >
      {active ? (
        <Check className="h-3 w-3" />
      ) : (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  )
}

type FilterChipRowProps = {
  label: string
  value: string
  onChange: (id: string) => void
  items: ReadonlyArray<{
    id: string
    label: string
    count?: number
    color?: string
  }>
}

function FilterChipRow({ label, value, onChange, items }: FilterChipRowProps) {
  return (
    <div className="px-6 py-2 border-b border-border/60">
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 scrollbar-none">
        <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">
          {label}
        </span>
        {items.map(item => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {item.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'tabular-nums',
                    active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type ActivePillProps = {
  tissue: string
  subtissue: string
  assay: string
  onRemove: () => void
}

function ActivePill({ tissue, subtissue, assay, onRemove }: ActivePillProps) {
  const color = assayColor(assay)
  const label = assayLabel(assay)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="group/pill inline-flex max-w-full items-center gap-1.5 rounded-full border border-transparent pl-2 pr-1 py-1 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <span className="truncate max-w-[10rem]">
              {tissue} · {label}
            </span>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${label} from ${tissue}`}
              className="rounded-full p-0.5 hover:bg-black/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="font-medium">
            {tissue} — {label}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {formatSubtissue(subtissue)}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Re-export of unused symbol prevents tree-shaking warning when consumers
// only import the trigger.
export type { ReactNode }
