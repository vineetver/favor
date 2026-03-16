"use client";

import { cn } from "@infra/utils";
import type { RegionSummary, TissueGroupRow } from "@features/gene/api/region";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_N = 15;

const STATE_COLORS: Record<string, string> = {
  promoter: "#ef4444",
  enhancer: "#f59e0b",
  transcription: "#22c55e",
  repressed: "#6b7280",
  quiescent: "#d1d5db",
  heterochromatin: "#9ca3af",
  bivalent: "#a855f7",
};

const EVIDENCE_COLORS: Record<string, string> = {
  signals: "#8b5cf6",
  enhancers: "#10b981",
  accessibility: "#3b82f6",
  ase: "#f43f5e",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TissueEvidence {
  tissue_name: string;
  signals: TissueGroupRow | null;
  chromatin: TissueGroupRow | null;
  enhancers: TissueGroupRow | null;
  accessibility: TissueGroupRow | null;
  loops: TissueGroupRow | null;
  ase: TissueGroupRow | null;
  convergence: number;
  score: number;
}

export interface TissueEvidenceData {
  signals: TissueGroupRow[];
  chromatin: TissueGroupRow[];
  enhancers: TissueGroupRow[];
  accessibility: TissueGroupRow[];
  loops: TissueGroupRow[];
  ase: TissueGroupRow[];
}

// ---------------------------------------------------------------------------
// Build + rank — deprioritize "Other" and "Cell Line"
// ---------------------------------------------------------------------------

const DEPRIORITIZED_GROUPS = new Set(["Other", "Cell Line", "Stem Cell"]);

function buildTissueEvidence(data: TissueEvidenceData): TissueEvidence[] {
  const map = new Map<string, TissueEvidence>();
  const get = (name: string): TissueEvidence => {
    let t = map.get(name);
    if (!t) {
      t = {
        tissue_name: name,
        signals: null,
        chromatin: null,
        enhancers: null,
        accessibility: null,
        loops: null,
        ase: null,
        convergence: 0,
        score: 0,
      };
      map.set(name, t);
    }
    return t;
  };

  for (const r of data.signals) get(r.tissue_name).signals = r;
  for (const r of data.chromatin) get(r.tissue_name).chromatin = r;
  for (const r of data.enhancers) get(r.tissue_name).enhancers = r;
  for (const r of data.accessibility) get(r.tissue_name).accessibility = r;
  for (const r of data.loops) get(r.tissue_name).loops = r;
  for (const r of data.ase) get(r.tissue_name).ase = r;

  for (const t of map.values()) {
    t.convergence = [
      t.signals,
      t.chromatin,
      t.enhancers,
      t.accessibility,
      t.loops,
      t.ase,
    ].filter(Boolean).length;
    t.score =
      (t.signals?.max_value ?? 0) +
      (t.enhancers?.max_value ?? 0) * 10 +
      (t.ase?.max_value ?? 0) +
      (t.accessibility?.max_value ?? 0);
  }

  return [...map.values()].sort((a, b) => {
    // Deprioritized groups always sort last
    const aDepri = DEPRIORITIZED_GROUPS.has(a.tissue_name) ? 1 : 0;
    const bDepri = DEPRIORITIZED_GROUPS.has(b.tissue_name) ? 1 : 0;
    if (aDepri !== bDepri) return aDepri - bDepri;
    // Then by convergence, then by score
    return b.convergence - a.convergence || b.score - a.score;
  });
}

// ---------------------------------------------------------------------------
// Cell renderers
// ---------------------------------------------------------------------------

function MiniBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <div className="w-10 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(pct * 100, 8)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {((pct * 100) | 0)}% of max across all tissues
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Dash() {
  return <span className="text-xs text-muted-foreground/30">&mdash;</span>;
}

// ---------------------------------------------------------------------------
// Convergence indicator
// ---------------------------------------------------------------------------

function ConvergenceDots({ count }: { count: number }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className="flex gap-[3px]">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i < count ? "bg-primary" : "bg-border"
                  )}
                />
              ))}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground ml-0.5">
              {count}/6
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Evidence from {count} of 6 data types. More types = higher confidence
          in tissue-specific regulation.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const nullsLast: ColumnDef<TissueEvidence>["sortingFn"] = (
  rowA,
  rowB,
  colId
) => {
  const a = rowA.getValue<number | null>(colId);
  const b = rowB.getValue<number | null>(colId);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
};

function buildColumns(maxes: {
  s: number;
  e: number;
  a: number;
  x: number;
}): ColumnDef<TissueEvidence>[] {
  return [
    {
      id: "tissue_name",
      accessorKey: "tissue_name",
      header: "Tissue",
      enableSorting: true,
      meta: {
        description:
          "Tissue group aggregated across all biosamples. Click a row to see details and links to individual data views.",
      },
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">
          {row.original.tissue_name}
        </span>
      ),
    },
    {
      id: "convergence",
      accessorKey: "convergence",
      header: "Evidence",
      enableSorting: true,
      sortDescFirst: true,
      meta: {
        description:
          "Number of independent data types (out of 6) with regulatory evidence in this tissue: cCRE signals, chromatin states, enhancer links, open chromatin, 3D contacts, allelic imbalance.",
      },
      cell: ({ row }) => (
        <ConvergenceDots count={row.original.convergence} />
      ),
    },
    {
      id: "signals",
      accessorFn: (r) => r.signals?.max_value ?? null,
      header: "cCRE Activity",
      meta: {
        description:
          "Epigenomic signal strength at candidate regulatory elements (cCREs) from ENCODE. Max Z-score across biosamples in this tissue group.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const s = row.original.signals;
        if (!s) return <Dash />;
        return (
          <MiniBar
            value={s.max_value}
            max={maxes.s}
            color={EVIDENCE_COLORS.signals}
            label={`${s.max_value.toFixed(1)} (${fmtK(s.count)})`}
          />
        );
      },
    },
    {
      id: "chromatin",
      accessorFn: (r) => (r.chromatin ? r.chromatin.count : null),
      header: "Chromatin",
      meta: {
        description:
          "Dominant chromatin state from the Roadmap 25-state model. Indicates whether this genomic region acts as a promoter, enhancer, repressed region, etc. in this tissue.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.chromatin;
        if (!c) return <Dash />;
        const state = c.top_item ?? "unknown";
        const color = STATE_COLORS[state] ?? "#9ca3af";
        return (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {state}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground/60">
              ({fmtK(c.count)})
            </span>
          </span>
        );
      },
    },
    {
      id: "enhancers",
      accessorFn: (r) => r.enhancers?.max_value ?? null,
      header: "Enhancer Links",
      meta: {
        description:
          "Enhancer-gene predictions (ABC, EPIraction, EpiMap, RE2G). Score indicates confidence that a nearby enhancer regulates this gene. >0.015 is likely functional.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const e = row.original.enhancers;
        if (!e) return <Dash />;
        return (
          <MiniBar
            value={e.max_value}
            max={maxes.e}
            color={EVIDENCE_COLORS.enhancers}
            label={`${fmtScore(e.max_value)} (${e.count})`}
          />
        );
      },
    },
    {
      id: "accessibility",
      accessorFn: (r) => r.accessibility?.max_value ?? null,
      header: "Open Chromatin",
      meta: {
        description:
          "ATAC-seq/DNase accessibility peaks. Open chromatin means DNA is accessible to transcription factors. Value is fold enrichment over background.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.accessibility;
        if (!a) return <Dash />;
        return (
          <MiniBar
            value={a.max_value}
            max={maxes.a}
            color={EVIDENCE_COLORS.accessibility}
            label={`${a.max_value.toFixed(1)}\u00d7 (${a.count})`}
          />
        );
      },
    },
    {
      id: "loops",
      accessorFn: (r) => r.loops?.count ?? null,
      header: "3D Contacts",
      meta: {
        description:
          "Chromatin loops detected by Hi-C or ChIA-PET. Physical 3D contacts connecting this gene region to distant regulatory elements.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const l = row.original.loops;
        if (!l) return <Dash />;
        return (
          <span className="text-xs tabular-nums text-muted-foreground">
            {l.count} {l.top_item ? `(${l.top_item})` : ""}
          </span>
        );
      },
    },
    {
      id: "ase",
      accessorFn: (r) => r.ase?.max_value ?? null,
      header: "Allelic Imbal.",
      meta: {
        description:
          "Allele-specific epigenomic activity. Whether the two alleles show different regulatory activity at cCREs. High -log10(p) indicates strong imbalance, suggesting a functional variant.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.ase;
        if (!a) return <Dash />;
        return (
          <MiniBar
            value={a.max_value}
            max={maxes.x}
            color={EVIDENCE_COLORS.ase}
            label={a.max_value.toFixed(1)}
          />
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Expanded detail panel
// ---------------------------------------------------------------------------

function TissueDetail({
  tissue,
  basePath,
}: {
  tissue: TissueEvidence;
  basePath: string;
}) {
  const tp = encodeURIComponent(tissue.tissue_name);

  const cards: { label: string; slug: string; lines: string[] }[] = [];

  if (tissue.signals)
    cards.push({
      label: "cCRE Activity",
      slug: "tissue-signals",
      lines: [
        `${fmtK(tissue.signals.count)} regulatory elements`,
        `Max Z-score: ${tissue.signals.max_value.toFixed(1)}`,
      ],
    });
  if (tissue.chromatin)
    cards.push({
      label: "Chromatin States",
      slug: "chromatin-states",
      lines: [
        `${fmtK(tissue.chromatin.count)} annotated segments`,
        `Dominant: ${tissue.chromatin.top_item ?? "\u2014"}`,
      ],
    });
  if (tissue.enhancers)
    cards.push({
      label: "Enhancer Links",
      slug: "enhancer-genes",
      lines: [
        `${tissue.enhancers.count} predictions`,
        `Best score: ${tissue.enhancers.max_value.toFixed(3)}`,
      ],
    });
  if (tissue.accessibility)
    cards.push({
      label: "Open Chromatin",
      slug: "accessibility",
      lines: [
        `${tissue.accessibility.count} peaks`,
        `Best: ${tissue.accessibility.max_value.toFixed(1)}\u00d7 enrichment`,
      ],
    });
  if (tissue.loops)
    cards.push({
      label: "3D Contacts",
      slug: "loops",
      lines: [
        `${tissue.loops.count} loop${tissue.loops.count !== 1 ? "s" : ""}`,
        tissue.loops.top_item ?? "",
      ],
    });
  if (tissue.ase)
    cards.push({
      label: "Allelic Imbalance",
      slug: "allele-specific",
      lines: [
        `${tissue.ase.count} tested${tissue.ase.significant ? `, ${tissue.ase.significant} significant` : ""}`,
        `Best \u2212log\u2081\u2080(p): ${tissue.ase.max_value.toFixed(1)}`,
      ],
    });

  return (
    <div className="py-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm font-medium text-foreground">
          {tissue.tissue_name}
        </span>
        <span className="text-xs text-muted-foreground">
          {tissue.convergence}/6 evidence types
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div
            key={c.slug}
            className="rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <span className="text-xs font-medium text-foreground">
              {c.label}
            </span>
            {c.lines.filter(Boolean).map((l, i) => (
              <p key={i} className="text-xs text-muted-foreground mt-0.5">
                {l}
              </p>
            ))}
            <Link
              href={`${basePath}/${c.slug}?tissue=${tp}`}
              className="inline-flex items-center gap-0.5 mt-1.5 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface Props {
  evidence: TissueEvidenceData;
  summary: RegionSummary | null;
  basePath: string;
}

export function TissueEvidenceSummary({
  evidence,
  summary,
  basePath,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const all = useMemo(() => buildTissueEvidence(evidence), [evidence]);
  const display = showAll ? all : all.slice(0, TOP_N);
  const hasMore = all.length > TOP_N;

  const maxes = useMemo(() => {
    let s = 0,
      e = 0,
      a = 0,
      x = 0;
    for (const t of all) {
      if (t.signals && t.signals.max_value > s) s = t.signals.max_value;
      if (t.enhancers && t.enhancers.max_value > e) e = t.enhancers.max_value;
      if (t.accessibility && t.accessibility.max_value > a)
        a = t.accessibility.max_value;
      if (t.ase && t.ase.max_value > x) x = t.ase.max_value;
    }
    return { s, e, a, x };
  }, [all]);

  const columns = useMemo(() => buildColumns(maxes), [maxes]);

  const totalRecords = summary
    ? Object.values(summary.counts).reduce((a, b) => a + b, 0)
    : null;

  const subtitle = [
    showAll
      ? `All ${all.length}`
      : `Top ${Math.min(TOP_N, all.length)} of ${all.length}`,
    "tissue groups ranked by evidence convergence",
    totalRecords != null ? `\u00b7 ${fmtK(totalRecords)} total records` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const toggle = hasMore ? (
    <button
      type="button"
      onClick={() => setShowAll(!showAll)}
      className="text-xs text-primary hover:underline"
    >
      {showAll ? `Show top ${TOP_N}` : `Show all ${all.length}`}
    </button>
  ) : undefined;

  return (
    <DataSurface
      title="Tissue Regulatory Evidence"
      subtitle={subtitle}
      headerActions={toggle}
      data={display}
      columns={columns}
      searchable={showAll}
      searchPlaceholder="Search tissues..."
      searchColumn="tissue_name"
      defaultPageSize={showAll ? 25 : TOP_N}
      pageSizeOptions={[25, 50]}
      exportable={showAll}
      exportFilename="tissue-evidence"
      emptyMessage="No tissue-specific regulatory evidence found for this gene."
      renderExpandedRow={(tissue) => (
        <TissueDetail tissue={tissue} basePath={basePath} />
      )}
    />
  );
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtScore(v: number): string {
  return v < 0.01 ? v.toExponential(0) : v.toFixed(2);
}
