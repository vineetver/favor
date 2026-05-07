"use client";

import { cn } from "@infra/utils";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { Filter, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CrisprTissueFacet } from "../api";
import { useCrispr } from "../hooks/use-crispr";
import type { CrisprRow, PerturbSeqRow } from "../types";

const PERTURBATION_TYPES = ["CRISPRn", "CRISPRi", "CRISPRa"] as const;
type PerturbationType = (typeof PERTURBATION_TYPES)[number];

const PERTURBATION_TYPE_DESCRIPTIONS: Record<PerturbationType, string> = {
  CRISPRn: "Knockout — gene fully disabled.",
  CRISPRi: "Interference — gene expression suppressed.",
  CRISPRa: "Activation — gene expression amplified.",
};

function isPerturbationType(value: string): value is PerturbationType {
  return (PERTURBATION_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums mt-0.5",
          highlight ? "text-destructive" : "text-foreground",
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared cell renderers
// ---------------------------------------------------------------------------

function MagnitudeBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0;
  return (
    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full",
          value < 0 ? "bg-blue-500" : "bg-red-500",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function GeneLink({ gene }: { gene: string }) {
  return (
    <Link
      href={`/hg38/gene/${encodeURIComponent(gene)}`}
      className="text-sm font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {gene}
    </Link>
  );
}

function PvalueCell({ value }: { value: number | undefined }) {
  if (value == null) return <Dash />;
  return (
    <span className="text-xs tabular-nums text-muted-foreground">
      {value < 0.001 ? value.toExponential(1) : value.toFixed(3)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Perturb-seq columns — shared between downstream and upstream
// ---------------------------------------------------------------------------

function buildPerturbSeqColumns(
  geneColumn: {
    id: string;
    key: "effect_gene" | "perturbation_gene";
    header: string;
  },
  maxLog2fc: number,
  options: { hasCellType: boolean; includeDataset?: boolean },
): ColumnDef<PerturbSeqRow, unknown>[] {
  const cols: ColumnDef<PerturbSeqRow, unknown>[] = [
    {
      id: geneColumn.id,
      accessorKey: geneColumn.key,
      header: geneColumn.header,
      enableSorting: false,
      cell: ({ getValue }) => <GeneLink gene={getValue() as string} />,
    },
    {
      id: "log2fc",
      accessorKey: "log2fc",
      header: "Log2 FC",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className="text-xs tabular-nums text-foreground">
            {v > 0 ? "+" : ""}
            {v.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "direction",
      accessorFn: (r) => r.log2fc,
      header: "Direction",
      enableSorting: false,
      cell: ({ row }) => (
        <span
          className={cn(
            "text-xs font-medium",
            row.original.log2fc < 0 ? "text-blue-600" : "text-red-600",
          )}
        >
          {row.original.log2fc < 0 ? "down" : "up"}
        </span>
      ),
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.log2fc),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <MagnitudeBar value={row.original.log2fc} max={maxLog2fc} />
      ),
    },
    {
      id: "padj",
      accessorKey: "padj",
      header: "Adj. P-Value",
      enableSorting: true,
      cell: ({ getValue }) => (
        <PvalueCell value={getValue() as number | undefined} />
      ),
    },
  ];

  if (options.hasCellType) {
    cols.push({
      id: "cell_type",
      accessorKey: "cell_type",
      header: "Cell Type",
      enableSorting: false,
      cell: ({ getValue }) => {
        const ct = getValue() as string | undefined;
        if (!ct) return <Dash />;
        return (
          <Badge variant="outline" className="text-[11px]">
            {ct}
          </Badge>
        );
      },
    });
  }

  if (options.includeDataset !== false) {
    cols.push({
      id: "dataset_id",
      accessorKey: "dataset_id",
      header: "Dataset",
      enableSorting: false,
      cell: ({ row }) => {
        const id = row.original.dataset_id;
        const title = row.original.study_title;
        const year = row.original.study_year;
        const label = (
          <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
            {id}
          </span>
        );
        if (!title) return label;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{label}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-xs">
              <p className="font-medium">{title}</p>
              {year && <p className="opacity-70">{year}</p>}
            </TooltipContent>
          </Tooltip>
        );
      },
    });
  }

  return cols;
}

// ---------------------------------------------------------------------------
// CRISPR columns
// ---------------------------------------------------------------------------

const PERTURBATION_TYPE_STYLE: Record<PerturbationType, string> = {
  CRISPRn: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  CRISPRi: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  CRISPRa:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

const PERTURBATION_TYPE_FALLBACK_STYLE =
  "bg-muted text-muted-foreground border-border";

function buildCrisprColumns(
  maxScore: number,
  showPerturbationGene: boolean,
): ColumnDef<CrisprRow, unknown>[] {
  const cols: ColumnDef<CrisprRow, unknown>[] = [];

  if (showPerturbationGene) {
    cols.push({
      id: "perturbation_gene",
      accessorKey: "perturbation_gene",
      header: "Gene",
      enableSorting: false,
      cell: ({ getValue }) => <GeneLink gene={getValue() as string} />,
    });
  }

  cols.push(
    {
      id: "perturbation_type",
      accessorKey: "perturbation_type",
      header: "Type",
      enableSorting: false,
      cell: ({ getValue }) => {
        const t = getValue() as string | undefined;
        if (!t) return <Dash />;
        const description = isPerturbationType(t)
          ? PERTURBATION_TYPE_DESCRIPTIONS[t]
          : t;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold cursor-help",
                  isPerturbationType(t)
                    ? PERTURBATION_TYPE_STYLE[t]
                    : PERTURBATION_TYPE_FALLBACK_STYLE,
                )}
              >
                {t}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      id: "cell_line",
      accessorKey: "cell_line",
      header: "Cell Line",
      enableSorting: false,
      cell: ({ row }) => {
        const cell = row.original.cell_line;
        const tissue = row.original.tissue;
        if (!cell && !tissue) return <Dash />;
        return (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">
              {cell ?? "\u2014"}
            </span>
            {tissue && (
              <span className="text-[10px] text-muted-foreground">
                {tissue}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "disease",
      accessorKey: "disease",
      header: "Disease",
      enableSorting: false,
      cell: ({ getValue }) => {
        const d = getValue() as string | undefined;
        if (!d) return <Dash />;
        return <span className="text-xs text-muted-foreground">{d}</span>;
      },
    },
    {
      id: "score",
      accessorKey: "score_value",
      header: "Score",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => {
        const value = row.original.score_value;
        const name = row.original.score_name;
        const interpretation = row.original.score_interpretation;
        const numeric = (
          <span className="text-xs tabular-nums text-foreground">
            {value.toFixed(2)}
          </span>
        );
        return (
          <div className="flex items-center gap-1.5">
            {numeric}
            <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
              {name}
            </span>
            {interpretation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-sm text-xs">
                  {interpretation}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: "magnitude",
      accessorFn: (r) => Math.abs(r.score_value),
      header: "Magnitude",
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => (
        <MagnitudeBar value={row.original.score_value} max={maxScore} />
      ),
    },
    {
      id: "is_significant",
      accessorKey: "is_significant",
      header: "Significant",
      enableSorting: true,
      cell: ({ row }) => {
        const sig = row.original.is_significant;
        const criteria = row.original.significance_criteria;
        const label = (
          <span
            className={cn(
              "text-xs font-medium",
              sig ? "text-red-500" : "text-muted-foreground",
            )}
          >
            {sig ? "Yes" : "No"}
          </span>
        );
        if (!criteria || criteria === "-") return label;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{label}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Threshold: {criteria}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  );

  return cols;
}

// ---------------------------------------------------------------------------
// Cell type filter
// ---------------------------------------------------------------------------

function CellTypeTabs({
  cellTypes,
  selected,
  onSelect,
}: {
  cellTypes: string[];
  selected: string | null;
  onSelect: (ct: string | null) => void;
}) {
  if (cellTypes.length <= 1) return null;
  const btn = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs rounded-md transition-colors",
        active
          ? "bg-background shadow-sm text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center p-0.5 bg-muted rounded-lg mb-4">
      {btn("All cell", selected === null, () => onSelect(null))}
      {cellTypes.map((ct) => btn(ct, selected === ct, () => onSelect(ct)))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function DownstreamSection({
  data,
  geneSymbol,
  totalCount,
}: {
  data: PerturbSeqRow[];
  geneSymbol: string;
  totalCount: number;
}) {
  const cellTypes = useMemo(
    () =>
      [
        ...new Set(data.map((r) => r.cell_type).filter(Boolean) as string[]),
      ].sort(),
    [data],
  );
  const [selectedCellType, setSelectedCellType] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      selectedCellType
        ? data.filter((r) => r.cell_type === selectedCellType)
        : data,
    [data, selectedCellType],
  );
  const maxLog2fc = useMemo(
    () => Math.max(...filtered.map((r) => Math.abs(r.log2fc)), 1),
    [filtered],
  );
  const hasCellType = cellTypes.length > 0;
  const columns = useMemo(
    () =>
      buildPerturbSeqColumns(
        { id: "effect_gene", key: "effect_gene", header: "Effect Gene" },
        maxLog2fc,
        { hasCellType },
      ),
    [maxLog2fc, hasCellType],
  );

  return (
    <div>
      <CellTypeTabs
        cellTypes={cellTypes}
        selected={selectedCellType}
        onSelect={setSelectedCellType}
      />
      <DataSurface
        title={`Downstream effects of ${geneSymbol} knockout`}
        subtitle={`${totalCount} genes significantly affected when ${geneSymbol} is knocked out (perturb-seq, padj < 0.05)`}
        data={filtered}
        columns={columns}
        searchable={false}
        defaultPageSize={25}
        pageSizeOptions={[25, 50]}
        exportable
        exportFilename={`downstream-effects-${geneSymbol}`}
        emptyMessage={`No perturb-seq downstream effects found for ${geneSymbol}`}
      />
    </div>
  );
}

function UpstreamSection({
  data,
  geneSymbol,
}: {
  data: PerturbSeqRow[];
  geneSymbol: string;
}) {
  // Drop self-perturbations (perturbation_gene === effect_gene === gene)
  // — they're QC positives, not upstream regulators.
  const filtered = useMemo(
    () => data.filter((r) => r.perturbation_gene !== r.effect_gene),
    [data],
  );
  const maxLog2fc = useMemo(
    () => Math.max(...filtered.map((r) => Math.abs(r.log2fc)), 1),
    [filtered],
  );
  const hasCellType = useMemo(
    () => filtered.some((r) => r.cell_type),
    [filtered],
  );
  const columns = useMemo(
    () =>
      buildPerturbSeqColumns(
        {
          id: "perturbation_gene",
          key: "perturbation_gene",
          header: "Perturbation Gene",
        },
        maxLog2fc,
        { hasCellType, includeDataset: false },
      ),
    [maxLog2fc, hasCellType],
  );

  // Hide the section entirely when nothing survives the self-perturbation
  // filter — an empty table tells the user nothing the absence wouldn't.
  if (filtered.length === 0) return null;

  return (
    <DataSurface
      title={`Upstream regulators of ${geneSymbol}`}
      subtitle={`Which gene knockouts significantly change ${geneSymbol} expression? (reverse lookup, self-perturbations excluded)`}
      data={filtered}
      columns={columns}
      searchable={false}
      defaultPageSize={25}
      pageSizeOptions={[25, 50]}
      exportable
      exportFilename={`upstream-regulators-${geneSymbol}`}
      emptyMessage={`No upstream regulators found for ${geneSymbol}`}
    />
  );
}

function CrisprTissuePicker({
  facets,
  selected,
  onToggle,
  onClear,
}: {
  facets: CrisprTissueFacet[];
  selected: ReadonlySet<string>;
  onToggle: (tissue: string) => void;
  onClear: () => void;
}) {
  if (facets.length === 0) return null;
  const label =
    selected.size === 0
      ? "All tissues"
      : selected.size === 1
        ? [...selected][0]
        : `${selected.size} tissues`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-[11px] gap-1.5",
            selected.size > 0 && "text-primary border-primary/40",
          )}
        >
          <Filter className="h-3 w-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2 max-h-80 overflow-auto">
        <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-border mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Tissue
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {facets.map((f) => {
            const active = selected.has(f.tissue);
            return (
              <button
                key={f.tissue}
                type="button"
                onClick={() => onToggle(f.tissue)}
                className={cn(
                  "flex items-center justify-between gap-2 px-2 py-1 rounded text-xs transition-colors text-left",
                  active
                    ? "bg-primary/10 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">{f.tissue}</span>
                <span className="tabular-nums text-[10px] text-muted-foreground/70 shrink-0">
                  {f.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CrisprFilterBar({
  selectedTypes,
  onToggleType,
  significantOnly,
  onToggleSignificant,
  tissueFacets,
  selectedTissues,
  onToggleTissue,
  onClearTissues,
  isFetching,
  countLabel,
}: {
  selectedTypes: ReadonlySet<PerturbationType>;
  onToggleType: (t: PerturbationType) => void;
  significantOnly: boolean;
  onToggleSignificant: () => void;
  tissueFacets: CrisprTissueFacet[];
  selectedTissues: ReadonlySet<string>;
  onToggleTissue: (tissue: string) => void;
  onClearTissues: () => void;
  isFetching: boolean;
  countLabel: string;
}) {
  const pillBase =
    "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer select-none";
  const pillActive = "bg-primary/10 text-primary border-primary/30";
  const pillIdle =
    "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30";

  return (
    <div className="flex items-center gap-3 flex-wrap text-[11px]">
      <span className="text-muted-foreground uppercase tracking-wider font-medium">
        Filter
      </span>
      <div className="flex items-center gap-1.5">
        {PERTURBATION_TYPES.map((t) => {
          const active = selectedTypes.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggleType(t)}
              className={cn(pillBase, active ? pillActive : pillIdle)}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="w-px h-4 bg-border" />
      <CrisprTissuePicker
        facets={tissueFacets}
        selected={selectedTissues}
        onToggle={onToggleTissue}
        onClear={onClearTissues}
      />
      <div className="w-px h-4 bg-border" />
      <button
        type="button"
        onClick={onToggleSignificant}
        className={cn(pillBase, significantOnly ? pillActive : pillIdle)}
      >
        Significant only
      </button>
      <div className="ml-auto flex items-center gap-2 text-muted-foreground">
        {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
        <span className="tabular-nums">{countLabel}</span>
      </div>
    </div>
  );
}

function CrisprSection({
  initialData,
  geneSymbol,
  totalCount,
  tissueFacets,
}: {
  initialData: CrisprRow[];
  geneSymbol: string;
  totalCount: number;
  tissueFacets: CrisprTissueFacet[];
}) {
  const [selectedTypes, setSelectedTypes] = useState<
    ReadonlySet<PerturbationType>
  >(() => new Set());
  const [selectedTissues, setSelectedTissues] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [significantOnly, setSignificantOnly] = useState(false);

  const filtersDirty =
    selectedTypes.size > 0 || selectedTissues.size > 0 || significantOnly;

  // Only seed react-query's initialData when filters are pristine AND we have
  // server-rendered rows. An empty seed (e.g. the SSR fetch was rate-limited
  // but the facet succeeded) would mark the query "successful with no data"
  // and react-query wouldn't refetch — keeping the table empty even though
  // the gene clearly has CRISPR data.
  const canSeedInitialData = !filtersDirty && initialData.length > 0;

  const { rows, hasMore, isLoading, isFetching } = useCrispr({
    loc: geneSymbol,
    filters: {
      perturbation_type:
        selectedTypes.size > 0 ? [...selectedTypes].join(",") : undefined,
      tissue:
        selectedTissues.size > 0 ? [...selectedTissues].join(",") : undefined,
      significant_only: significantOnly || undefined,
    },
    initialData: canSeedInitialData
      ? {
          data: initialData,
          page_info: {
            next_cursor: null,
            count: initialData.length,
            has_more: initialData.length < totalCount,
            total_count: totalCount,
          },
        }
      : undefined,
    enabled: true,
  });

  const data = rows;

  // Best-effort precise total when only tissue filters are active — sum the
  // facet counts. The API doesn't expose `total_count` on filtered queries,
  // so otherwise we rely on `hasMore` to indicate "100+".
  const tissueOnlyFilter =
    selectedTissues.size > 0 && selectedTypes.size === 0 && !significantOnly;
  const tissueFilterTotal = useMemo(() => {
    if (!tissueOnlyFilter) return null;
    return tissueFacets
      .filter((f) => selectedTissues.has(f.tissue))
      .reduce((sum, f) => sum + f.count, 0);
  }, [tissueFacets, selectedTissues, tissueOnlyFilter]);

  const maxScore = useMemo(
    () => Math.max(...data.map((r) => Math.abs(r.score_value)), 1),
    [data],
  );
  const showPerturbationGene = useMemo(
    () => new Set(data.map((r) => r.perturbation_gene)).size > 1,
    [data],
  );
  const columns = useMemo(
    () => buildCrisprColumns(maxScore, showPerturbationGene),
    [maxScore, showPerturbationGene],
  );

  const toggleType = (t: PerturbationType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleTissue = (t: string) => {
    setSelectedTissues((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const shown = data.length;
  const shownText = shown.toLocaleString();
  const shownPlus = hasMore ? `${shownText}+` : shownText;

  // Single source of truth: pick the count label that matches the filter
  // state. Each branch returns explicitly so the cases stay flat.
  const countLabel = (() => {
    if (tissueFilterTotal != null) {
      return `${shownText} of ${tissueFilterTotal.toLocaleString()}`;
    }
    return `${shownPlus} shown`;
  })();

  const subtitle = (() => {
    if (tissueFilterTotal != null) {
      return `${geneSymbol} — ${tissueFilterTotal.toLocaleString()} screens match the selected tissues, showing ${shownText}`;
    }
    if (filtersDirty) {
      return `${geneSymbol} — ${shownPlus} screens match the current filters`;
    }
    return `${geneSymbol} — first ${shownPlus} CRISPR screens (filter to narrow)`;
  })();

  return (
    <div className="space-y-3">
      <CrisprFilterBar
        selectedTypes={selectedTypes}
        onToggleType={toggleType}
        significantOnly={significantOnly}
        onToggleSignificant={() => setSignificantOnly((v) => !v)}
        tissueFacets={tissueFacets}
        selectedTissues={selectedTissues}
        onToggleTissue={toggleTissue}
        onClearTissues={() => setSelectedTissues(new Set())}
        isFetching={isFetching}
        countLabel={countLabel}
      />
      <DataSurface
        title="CRISPR essentiality across cell lines"
        subtitle={subtitle}
        data={data}
        columns={columns}
        searchable={false}
        defaultPageSize={25}
        pageSizeOptions={[25, 50]}
        exportable
        exportFilename={`crispr-essentiality-${geneSymbol}`}
        loading={isLoading}
        emptyMessage={
          filtersDirty
            ? "No CRISPR screens match the current filters."
            : `No CRISPR essentiality data found for ${geneSymbol}`
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface PerturbationViewProps {
  geneSymbol: string;
  summary: {
    perturbSeqDatasets: number;
    downstreamTargets: number;
    crisprScreens: number;
    essentialIn: number;
  };
  downstream: PerturbSeqRow[];
  upstream: PerturbSeqRow[];
  crispr: CrisprRow[];
  crisprTotalCount: number;
  downstreamTotalCount: number;
  crisprTissueFacets: CrisprTissueFacet[];
}

export function PerturbationView({
  geneSymbol,
  summary,
  downstream,
  upstream,
  crispr,
  crisprTotalCount,
  downstreamTotalCount,
  crisprTissueFacets,
}: PerturbationViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Perturb-seq datasets"
          value={summary.perturbSeqDatasets}
        />
        <StatCard
          label="Downstream targets"
          value={summary.downstreamTargets}
        />
        <StatCard label="CRISPR screens" value={summary.crisprScreens} />
        <StatCard
          label="Essential in"
          value={`${summary.essentialIn} lines`}
          highlight
        />
      </div>
      <SourceLine />
      {downstream.length > 0 && (
        <DownstreamSection
          data={downstream}
          geneSymbol={geneSymbol}
          totalCount={downstreamTotalCount}
        />
      )}
      {upstream.length > 0 && (
        <UpstreamSection data={upstream} geneSymbol={geneSymbol} />
      )}
      {/* Show the section if either the facet sum OR the SSR slice indicates
          data — that way a missing facet doesn't suppress a section that has
          rows, and an empty SSR slice doesn't suppress a section the facet
          knows is non-empty. */}
      {(crisprTotalCount > 0 || crispr.length > 0) && (
        <CrisprSection
          initialData={crispr}
          geneSymbol={geneSymbol}
          totalCount={crisprTotalCount}
          tissueFacets={crisprTissueFacets}
        />
      )}
    </div>
  );
}

function SourceLine() {
  const linkClass = "text-primary hover:underline";
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
      <span className="font-medium text-foreground">Data sources.</span> CRISPR
      essentiality screens and Perturb-seq differential expression are
      aggregated from the{" "}
      <a
        href="https://www.ebi.ac.uk/perturbation-catalogue/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        EBI Perturbation Catalogue
      </a>
      , which itself pools{" "}
      <a
        href="https://orcs.thebiogrid.org/"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        BioGRID ORCS
      </a>{" "}
      and published Perturb-seq atlases.
    </div>
  );
}
