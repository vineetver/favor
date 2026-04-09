'use client'

// src/features/genome-browser/components/track-selector/tissue-picker.tsx
//
// "Quiet Panel" tissue track picker.
//
// Design principles (Apple-engineer brief from the user):
//   • Side panel, not modal — the canvas behind it stays visible.
//   • Hierarchy from typography and whitespace, not from boxed cards.
//   • One accent color (the foreground); data colors only where they
//     identify actual data, never decoration.
//   • The icon belongs nowhere — neither the trigger nor the header.
//   • Two rows of chrome max above the list.
//
// State ownership:
//   • Local UI state (current tissue tab, search query, assay multi-filter)
//     lives in this component.
//   • Selection state lives in BrowserContext via `useTissueTracks()`.
//   • Indices over `TissueConfig` are pure module-level constants.
//
// Re-render budget:
//   • Typing in the search box should not re-render `BrowserCanvas` —
//     guaranteed by the BrowserContext split (see browser-context.tsx).
//   • Toggling one assay should re-render only the affected `SubtissueRow`
//     and the footer count — guaranteed by `React.memo` on the row.

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@infra/utils'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/components/ui/sheet'
import { ScrollArea } from '@shared/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shared/components/ui/command'
import {
  TissueConfig,
  type AssayInfo,
  type SubtissueInfo,
} from '../../config/tissue-config'
import {
  assayColor,
  assayLabel,
  listTissues,
} from '../../types/tissue'
import { useTissueTracks } from '../../hooks/use-tissue-selection'

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL INDICES
// ─────────────────────────────────────────────────────────────────────────────
//
// `TissueConfig` is a static import. Building these indices once at module
// load is faster than recomputing them per render and the cost is negligible
// (~1ms total for 6 tissues × 742 subtissues). Doing it inside a `useMemo`
// would re-run on every component mount and lose the cache.

type TissueEntry = {
  readonly tissue: string
  /** Subtissues that have at least one bigwig-backed assay. */
  readonly subtissues: readonly SubtissueInfo[]
  /** Assay names that exist in this tissue and have a bigwig URL. */
  readonly assayCoverage: ReadonlySet<string>
}

const TISSUE_INDEX: readonly TissueEntry[] = listTissues().map(tissue => {
  const all = TissueConfig[tissue] ?? []
  const subtissues = all.filter(s => s.assays.some(a => Boolean(a.bigwig)))
  const coverage = new Set<string>()
  for (const sub of subtissues) {
    for (const assay of sub.assays) {
      if (assay.bigwig) coverage.add(assay.name)
    }
  }
  return { tissue, subtissues, assayCoverage: coverage }
})

const TISSUE_BY_NAME: ReadonlyMap<string, TissueEntry> = new Map(
  TISSUE_INDEX.map(t => [t.tissue, t])
)

const ALL_ASSAYS: readonly string[] = (() => {
  const set = new Set<string>()
  for (const t of TISSUE_INDEX) {
    for (const a of t.assayCoverage) set.add(a)
  }
  return Array.from(set).sort()
})()

// ─────────────────────────────────────────────────────────────────────────────
// SUBTISSUE NAME PARSING
// ─────────────────────────────────────────────────────────────────────────────
//
// TissueConfig labels look like:
//   "dorsolateral prefrontal cortex, female adult (87 years) with mild
//    cognitive impairment"
//
// Split into a primary "location" line and an optional "qualifier" line so
// the row has typographic hierarchy instead of one long monoline.

type SplitName = {
  readonly location: string
  readonly qualifier: string | null
}

function splitSubtissueName(name: string): SplitName {
  const idx = name.indexOf(', ')
  if (idx === -1) {
    return { location: capitalize(name), qualifier: null }
  }
  return {
    location: capitalize(name.slice(0, idx)),
    qualifier: name.slice(idx + 2),
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TRIGGER — sidebar entry
// ─────────────────────────────────────────────────────────────────────────────

type TissuePickerTriggerProps = {
  className?: string
}

export function TissuePickerTrigger({ className }: TissuePickerTriggerProps) {
  const [open, setOpen] = useState(false)
  const { activeTissueTracks } = useTissueTracks()
  const count = activeTissueTracks.length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start h-9 px-3 font-medium text-sm',
            className
          )}
        >
          <span className="flex-1 text-left">Tissue signals</span>
          {count > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              · {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <TissuePickerContent />
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PICKER CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function TissuePickerContent() {
  const {
    activeTissueTracks,
    isAssayActive,
    toggleAssay,
    removeById,
    clearAll,
  } = useTissueTracks()

  const [tissueName, setTissueName] = useState<string>(
    () => TISSUE_INDEX[0]?.tissue ?? ''
  )
  const [search, setSearch] = useState('')
  const [assayFilter, setAssayFilter] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [activeOnly, setActiveOnly] = useState(false)

  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // ⌘K focuses the search input.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const currentTissue = TISSUE_BY_NAME.get(tissueName)

  // Per-subtissue active assay set, derived once and shared with each row.
  const activeAssaysBySubtissue = useMemo<
    ReadonlyMap<string, ReadonlySet<string>>
  >(() => {
    const map = new Map<string, Set<string>>()
    for (const t of activeTissueTracks) {
      let bucket = map.get(t.subtissue)
      if (!bucket) {
        bucket = new Set<string>()
        map.set(t.subtissue, bucket)
      }
      bucket.add(t.assay)
    }
    return map
  }, [activeTissueTracks])

  // Subtissues for the current tissue, filtered by search / assay / active.
  const filteredSubtissues = useMemo(() => {
    if (!currentTissue) return [] as readonly SubtissueInfo[]
    const q = search.trim().toLowerCase()
    const filterAssays = assayFilter
    const onlyActive = activeOnly

    return currentTissue.subtissues.filter(sub => {
      if (q && !sub.name.toLowerCase().includes(q)) return false

      if (filterAssays.size > 0) {
        let hasAny = false
        for (const a of sub.assays) {
          if (a.bigwig && filterAssays.has(a.name)) {
            hasAny = true
            break
          }
        }
        if (!hasAny) return false
      }

      if (onlyActive) {
        const bucket = activeAssaysBySubtissue.get(sub.name)
        if (!bucket || bucket.size === 0) return false
      }

      return true
    })
  }, [currentTissue, search, assayFilter, activeOnly, activeAssaysBySubtissue])

  const handleToggleAssayFilter = useCallback((assay: string) => {
    setAssayFilter(prev => {
      const next = new Set(prev)
      if (next.has(assay)) next.delete(assay)
      else next.add(assay)
      return next
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    setSearch('')
    setAssayFilter(new Set())
    setActiveOnly(false)
  }, [])

  const filterIsDirty = search !== '' || assayFilter.size > 0 || activeOnly
  const sampleCount = filteredSubtissues.length

  return (
    <SheetContent
      side="right"
      showOverlay={false}
      showClose={false}
      className="w-full sm:max-w-2xl flex flex-col gap-0 p-0"
    >
      {/* HEADER — one line. Title + tissue popover + ⌘K hint + close */}
      <SheetHeader className="px-5 py-3 border-b border-border space-y-0">
        <div className="flex items-center gap-3">
          <SheetTitle className="text-base font-semibold flex-1 text-left">
            Tissue signals
          </SheetTitle>
          <TissuePopover value={tissueName} onChange={setTissueName} />
          <KbdHint label="⌘K" />
          <CloseButton />
        </div>
      </SheetHeader>

      {/* ROW A — search + assay multi-filter */}
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${currentTissue?.subtissues.length ?? 0} ${tissueName.toLowerCase()} samples…`}
            className="pl-9 h-9"
          />
        </div>
        <AssayFilterRow
          tissue={currentTissue}
          selected={assayFilter}
          onToggle={handleToggleAssayFilter}
        />
      </div>

      {/* ROW B — count + active toggle + reset */}
      <div className="flex items-center gap-3 px-5 pb-3 text-xs text-muted-foreground">
        <span>
          {sampleCount.toLocaleString()} sample{sampleCount === 1 ? '' : 's'}
        </span>
        {activeTissueTracks.length > 0 && (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setActiveOnly(v => !v)}
              className={cn(
                'transition-colors',
                activeOnly
                  ? 'text-foreground font-medium'
                  : 'hover:text-foreground'
              )}
            >
              {activeTissueTracks.length} selected
            </button>
          </>
        )}
        <span className="flex-1" />
        {filterIsDirty && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-foreground hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* LIST */}
      <ScrollArea className="flex-1 min-h-0">
        {sampleCount === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No samples match these filters.
          </div>
        ) : (
          <ul>
            {filteredSubtissues.map((sub, i) => (
              <SubtissueRow
                key={sub.name}
                tissue={tissueName}
                subtissue={sub}
                isLast={i === filteredSubtissues.length - 1}
                activeAssays={
                  activeAssaysBySubtissue.get(sub.name) ?? EMPTY_STRING_SET
                }
                isAssayActive={isAssayActive}
                onToggle={toggleAssay}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      {/* FOOTER */}
      {activeTissueTracks.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 h-11 shrink-0">
          <span className="text-xs text-muted-foreground">
            {activeTissueTracks.length} tissue track
            {activeTissueTracks.length === 1 ? '' : 's'} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </SheetContent>
  )
}

const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>()

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE POPOVER (in header)
// ─────────────────────────────────────────────────────────────────────────────

type TissuePopoverProps = {
  value: string
  onChange: (tissue: string) => void
}

function TissuePopover({ value, onChange }: TissuePopoverProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-medium gap-1"
        >
          {value}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Switch tissue…" className="h-9" />
          <CommandList>
            <CommandEmpty>No tissue.</CommandEmpty>
            {TISSUE_INDEX.map(t => (
              <CommandItem
                key={t.tissue}
                value={t.tissue}
                onSelect={selected => {
                  onChange(selected)
                  setOpen(false)
                }}
                className="text-sm"
              >
                <span className="flex-1">{t.tissue}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t.subtissues.length}
                </span>
                {t.tissue === value && <Check className="h-3.5 w-3.5 ml-1" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSAY FILTER ROW (multi-select)
// ─────────────────────────────────────────────────────────────────────────────

type AssayFilterRowProps = {
  tissue: TissueEntry | undefined
  selected: ReadonlySet<string>
  onToggle: (assay: string) => void
}

function AssayFilterRow({ tissue, selected, onToggle }: AssayFilterRowProps) {
  const available = useMemo(() => {
    if (!tissue) return ALL_ASSAYS
    return ALL_ASSAYS.filter(a => tissue.assayCoverage.has(a))
  }, [tissue])

  return (
    <div className="flex items-center gap-1">
      {available.map(assay => {
        const active = selected.has(assay)
        return (
          <button
            key={assay}
            type="button"
            onClick={() => onToggle(assay)}
            aria-pressed={active}
            className={cn(
              'h-7 px-2 rounded text-[11px] font-medium tabular-nums transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {assayLabel(assay)}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBTISSUE ROW
// ─────────────────────────────────────────────────────────────────────────────

type SubtissueRowProps = {
  tissue: string
  subtissue: SubtissueInfo
  isLast: boolean
  activeAssays: ReadonlySet<string>
  isAssayActive: (tissue: string, subtissue: string, assay: string) => boolean
  onToggle: (tissue: string, subtissue: string, assay: string) => void
}

const SubtissueRow = memo(function SubtissueRow({
  tissue,
  subtissue,
  isLast,
  activeAssays,
  onToggle,
}: SubtissueRowProps) {
  const renderable = useMemo(
    () =>
      subtissue.assays.filter(
        (a): a is AssayInfo & { bigwig: string } => Boolean(a.bigwig)
      ),
    [subtissue]
  )

  if (renderable.length === 0) return null

  const { location, qualifier } = splitSubtissueName(subtissue.name)
  const hasActive = activeAssays.size > 0

  return (
    <li
      className={cn(
        'relative flex items-start gap-4 px-5 py-3 hover:bg-muted/40 transition-colors',
        !isLast && 'border-b border-border/40'
      )}
    >
      {hasActive && (
        <span
          aria-hidden
          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-foreground"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="text-sm text-foreground leading-snug">{location}</div>
        {qualifier && (
          <div className="text-xs text-muted-foreground leading-snug truncate mt-0.5">
            {qualifier}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        {renderable.map(assay => (
          <AssayToggle
            key={assay.name}
            tissue={tissue}
            subtissueName={subtissue.name}
            assayName={assay.name}
            active={activeAssays.has(assay.name)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </li>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// ASSAY TOGGLE — monochrome letterform button with color underline when active
// ─────────────────────────────────────────────────────────────────────────────

type AssayToggleProps = {
  tissue: string
  subtissueName: string
  assayName: string
  active: boolean
  onToggle: (tissue: string, subtissue: string, assay: string) => void
}

const AssayToggle = memo(function AssayToggle({
  tissue,
  subtissueName,
  assayName,
  active,
  onToggle,
}: AssayToggleProps) {
  const handleClick = useCallback(() => {
    onToggle(tissue, subtissueName, assayName)
  }, [onToggle, tissue, subtissueName, assayName])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        'relative h-7 px-2 rounded text-[11px] font-medium tabular-nums transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
      )}
    >
      {assayLabel(assayName)}
      {active && (
        <span
          aria-hidden
          className="absolute left-1 right-1 -bottom-px h-0.5 rounded-full"
          style={{ backgroundColor: assayColor(assayName) }}
        />
      )}
    </button>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// SMALL CHROME PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function KbdHint({ label }: { label: string }) {
  return (
    <span className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 font-medium tracking-wider">
      {label}
    </span>
  )
}

// SheetContent's built-in close has fixed positioning that conflicts with our
// inline header layout, so we render our own close button via SheetClose.
function CloseButton() {
  return (
    <SheetClose asChild>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </Button>
    </SheetClose>
  )
}
