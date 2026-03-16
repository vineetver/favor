"use client";

import { cn } from "@infra/utils";
import type { RegionSummary, TissueGroupRow } from "@features/gene/api/region";
import { inferTissueGroup } from "@shared/utils/tissue-format";
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
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  qtls: "#f59e0b",
  chrombpnet: "#06b6d4",
  variantAI: "#ec4899",
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
  qtls: TissueGroupRow | null;
  chrombpnet: TissueGroupRow | null;
  variantAllelicImbalance: TissueGroupRow | null;
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
  /** Variant-level: tissue_name is fine-grained, needs inferTissueGroup mapping */
  qtls?: TissueGroupRow[];
  chrombpnet?: TissueGroupRow[];
  variantAllelicImbalance?: TissueGroupRow[];
}

// ---------------------------------------------------------------------------
// Build + rank — deprioritize "Other" and "Cell Line"
// ---------------------------------------------------------------------------

const DEPRIORITIZED_GROUPS = new Set(["Other", "Cell Line", "Stem Cell"]);

/** Aggregate fine-grained tissue_name rows into tissue_group rows */
function aggregateToTissueGroups(rows: TissueGroupRow[]): TissueGroupRow[] {
  const map = new Map<string, TissueGroupRow>();
  for (const r of rows) {
    const group = inferTissueGroup(r.tissue_name);
    const existing = map.get(group);
    if (!existing) {
      map.set(group, { tissue_name: group, max_value: r.max_value, count: r.count, significant: r.significant, top_item: r.top_item });
    } else {
      existing.count += r.count;
      if (r.max_value > existing.max_value) {
        existing.max_value = r.max_value;
        existing.top_item = r.top_item;
      }
      if (r.significant != null) {
        existing.significant = (existing.significant ?? 0) + r.significant;
      }
    }
  }
  return [...map.values()];
}

const TOTAL_EVIDENCE_TYPES = 9;

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
        qtls: null,
        chrombpnet: null,
        variantAllelicImbalance: null,
        convergence: 0,
        score: 0,
      };
      map.set(name, t);
    }
    return t;
  };

  // Region-level evidence (already tissue_group)
  for (const r of data.signals) get(r.tissue_name).signals = r;
  for (const r of data.chromatin) get(r.tissue_name).chromatin = r;
  for (const r of data.enhancers) get(r.tissue_name).enhancers = r;
  for (const r of data.accessibility) get(r.tissue_name).accessibility = r;
  for (const r of data.loops) get(r.tissue_name).loops = r;
  for (const r of data.ase) get(r.tissue_name).ase = r;

  // Variant-level evidence (tissue_name is fine-grained, aggregate to groups)
  if (data.qtls?.length) {
    for (const r of aggregateToTissueGroups(data.qtls)) get(r.tissue_name).qtls = r;
  }
  if (data.chrombpnet?.length) {
    for (const r of aggregateToTissueGroups(data.chrombpnet)) get(r.tissue_name).chrombpnet = r;
  }
  if (data.variantAllelicImbalance?.length) {
    for (const r of aggregateToTissueGroups(data.variantAllelicImbalance)) get(r.tissue_name).variantAllelicImbalance = r;
  }

  for (const t of map.values()) {
    t.convergence = [
      t.signals, t.chromatin, t.enhancers, t.accessibility, t.loops, t.ase,
      t.qtls, t.chrombpnet, t.variantAllelicImbalance,
    ].filter(Boolean).length;
    t.score =
      (t.signals?.max_value ?? 0) +
      (t.enhancers?.max_value ?? 0) * 10 +
      (t.ase?.max_value ?? 0) +
      (t.accessibility?.max_value ?? 0) +
      (t.qtls?.max_value ?? 0) * 0.1;
  }

  return [...map.values()].sort((a, b) => {
    const aDepri = DEPRIORITIZED_GROUPS.has(a.tissue_name) ? 1 : 0;
    const bDepri = DEPRIORITIZED_GROUPS.has(b.tissue_name) ? 1 : 0;
    if (aDepri !== bDepri) return aDepri - bDepri;
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
  detail,
}: {
  value: number;
  max: number;
  color: string;
  /** Inline label: the actual value, e.g. "7.0 Z" */
  label: string;
  /** Tooltip detail, e.g. "Max Z-score 7.0 across 39.5K cCREs" */
  detail: string;
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
          {detail}
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
              {Array.from({ length: TOTAL_EVIDENCE_TYPES }, (_, i) => (
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
              {count}/{TOTAL_EVIDENCE_TYPES}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Evidence from {count} of {TOTAL_EVIDENCE_TYPES} data types (6 region + 3 variant).
          More types = higher confidence in tissue-specific regulation.
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
  q: number;
  cb: number;
  vai: number;
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
            label={`${s.max_value.toFixed(1)} Z \u00b7 ${fmtK(s.count)}`}
            detail={`Max Z-score: ${s.max_value.toFixed(1)} across ${fmtK(s.count)} cCREs in this tissue group`}
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
            label={`${fmtScore(e.max_value)} \u00b7 ${e.count}`}
            detail={`Best enhancer score: ${fmtScore(e.max_value)} across ${e.count} predictions. >0.015 = likely functional.`}
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
            label={`${a.max_value.toFixed(1)}\u00d7 \u00b7 ${a.count}`}
            detail={`${a.max_value.toFixed(1)}\u00d7 fold enrichment across ${a.count} peaks`}
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
            label={`${a.max_value.toFixed(1)} \u00b7 ${a.count}`}
            detail={`Best \u2212log\u2081\u2080(p): ${a.max_value.toFixed(1)} across ${a.count} observations`}
          />
        );
      },
    },
    {
      id: "qtls",
      accessorFn: (r) => r.qtls?.count ?? null,
      header: "QTLs",
      meta: {
        description:
          "eQTL/sQTL associations for variants near this gene. Shows how many variant–gene–tissue associations were detected across 7 sources (GTEx, eQTL Catalogue, etc.).",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const q = row.original.qtls;
        if (!q) return <Dash />;
        return (
          <MiniBar
            value={q.max_value}
            max={maxes.q}
            color={EVIDENCE_COLORS.qtls}
            label={`${q.max_value.toFixed(0)} \u00b7 ${q.count}`}
            detail={`Best \u2212log\u2081\u2080(p): ${q.max_value.toFixed(1)}, ${q.count} QTL associations${q.significant ? `, ${q.significant} significant` : ""}`}
          />
        );
      },
    },
    {
      id: "chrombpnet",
      accessorFn: (r) => r.chrombpnet?.count ?? null,
      header: "ChromBPNet",
      meta: {
        description:
          "Deep learning (ChromBPNet) predictions of how variants in this region affect chromatin accessibility in each tissue.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.chrombpnet;
        if (!c) return <Dash />;
        return (
          <span className="text-xs tabular-nums text-muted-foreground">{c.count}</span>
        );
      },
    },
    {
      id: "variantAllelicImbalance",
      accessorFn: (r) => r.variantAllelicImbalance?.max_value ?? null,
      header: "Histone Imbal.",
      meta: {
        description:
          "ENTEx histone allelic imbalance — whether variant alleles show different histone modification levels. High \u2212log\u2081\u2080(p) = strong imbalance suggesting a functional variant.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const v = row.original.variantAllelicImbalance;
        if (!v) return <Dash />;
        return (
          <MiniBar
            value={v.max_value}
            max={maxes.vai}
            color={EVIDENCE_COLORS.variantAI}
            label={`${v.max_value.toFixed(1)} \u00b7 ${v.count}`}
            detail={`Best \u2212log\u2081\u2080(p): ${v.max_value.toFixed(1)}, ${v.count} observations${v.significant ? `, ${v.significant} significant` : ""}`}
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
  const tg = encodeURIComponent(tissue.tissue_name);

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
  if (tissue.qtls)
    cards.push({
      label: "QTLs",
      slug: "qtls",
      lines: [
        `${tissue.qtls.count} associations${tissue.qtls.significant ? `, ${tissue.qtls.significant} significant` : ""}`,
        `Best \u2212log\u2081\u2080(p): ${tissue.qtls.max_value.toFixed(1)}`,
      ],
    });
  if (tissue.chrombpnet)
    cards.push({
      label: "ChromBPNet",
      slug: "chrombpnet",
      lines: [
        `${tissue.chrombpnet.count} predictions`,
      ],
    });
  if (tissue.variantAllelicImbalance)
    cards.push({
      label: "Histone Imbalance",
      slug: "qtls", // links to QTLs tab for now
      lines: [
        `${tissue.variantAllelicImbalance.count} observations${tissue.variantAllelicImbalance.significant ? `, ${tissue.variantAllelicImbalance.significant} significant` : ""}`,
        `Best \u2212log\u2081\u2080(p): ${tissue.variantAllelicImbalance.max_value.toFixed(1)}`,
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
        {cards.map((c) => {
          const href = `${basePath}/${c.slug}?tissue_group=${tg}`;

          return (
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
                href={href}
                className="inline-flex items-center gap-0.5 mt-1.5 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
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
  const all = useMemo(() => buildTissueEvidence(evidence), [evidence]);

  const maxes = useMemo(() => {
    let s = 0, e = 0, a = 0, x = 0, q = 0, cb = 0, vai = 0;
    for (const t of all) {
      if (t.signals && t.signals.max_value > s) s = t.signals.max_value;
      if (t.enhancers && t.enhancers.max_value > e) e = t.enhancers.max_value;
      if (t.accessibility && t.accessibility.max_value > a) a = t.accessibility.max_value;
      if (t.ase && t.ase.max_value > x) x = t.ase.max_value;
      if (t.qtls && t.qtls.max_value > q) q = t.qtls.max_value;
      if (t.chrombpnet && t.chrombpnet.max_value > cb) cb = t.chrombpnet.max_value;
      if (t.variantAllelicImbalance && t.variantAllelicImbalance.max_value > vai) vai = t.variantAllelicImbalance.max_value;
    }
    return { s, e, a, x, q, cb, vai };
  }, [all]);

  const columns = useMemo(() => buildColumns(maxes), [maxes]);

  const totalRecords = summary
    ? Object.values(summary.counts).reduce((a, b) => a + b, 0)
    : null;

  const subtitle = [
    `${all.length} tissue groups ranked by evidence convergence`,
    totalRecords != null ? `\u00b7 ${fmtK(totalRecords)} total records` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DataSurface
      title="Tissue Regulatory Evidence"
      subtitle={subtitle}
      data={all}
      columns={columns}
      searchable={false}
      defaultPageSize={all.length}
      pageSizeOptions={[all.length]}
      exportable
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
