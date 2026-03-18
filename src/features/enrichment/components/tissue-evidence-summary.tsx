"use client";

import { cn } from "@infra/utils";
import type { RegionSummary, TissueGroupRow } from "@features/enrichment/api/region";
import { formatCount, fmtScore } from "@shared/utils/tissue-format";
import { Dash } from "@shared/components/ui/dash";
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

const STATE_LABELS: Record<string, string> = {
  promoter: "Promoter",
  enhancer: "Enhancer",
  transcription: "Transcribed",
  repressed: "Repressed",
  quiescent: "Quiescent",
  heterochromatin: "Heterochromatin",
  bivalent: "Bivalent",
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
  crisprEssentiality: TissueGroupRow | null;
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
  qtls?: TissueGroupRow[];
  chrombpnet?: TissueGroupRow[];
  variantAllelicImbalance?: TissueGroupRow[];
  crisprEssentiality?: TissueGroupRow[];
}

// ---------------------------------------------------------------------------
// Build + rank
// ---------------------------------------------------------------------------

const DEPRIORITIZED_GROUPS = new Set(["Other", "Cell Line", "Stem Cell"]);

const EVIDENCE_TYPES = [
  { key: "signals", label: "Signals" },
  { key: "chromatin", label: "Chromatin" },
  { key: "accessibility", label: "Accessibility" },
  { key: "enhancers", label: "Enhancers" },
  { key: "loops", label: "Loops" },
  { key: "ase", label: "Allelic Activity" },
  { key: "qtls", label: "QTLs" },
  { key: "chrombpnet", label: "ChromBPNet" },
  { key: "variantAllelicImbalance", label: "Histone Imbal." },
  { key: "crisprEssentiality", label: "CRISPR Essentiality" },
] as const;

const TOTAL_EVIDENCE_TYPES = EVIDENCE_TYPES.length;

function buildTissueEvidence(data: TissueEvidenceData): TissueEvidence[] {
  const map = new Map<string, TissueEvidence>();
  const get = (name: string): TissueEvidence => {
    let t = map.get(name);
    if (!t) {
      t = {
        tissue_name: name,
        signals: null, chromatin: null, enhancers: null,
        accessibility: null, loops: null, ase: null,
        qtls: null, chrombpnet: null, variantAllelicImbalance: null,
        crisprEssentiality: null,
        convergence: 0, score: 0,
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
  if (data.qtls?.length) for (const r of data.qtls) get(r.tissue_name).qtls = r;
  if (data.chrombpnet?.length) for (const r of data.chrombpnet) get(r.tissue_name).chrombpnet = r;
  if (data.variantAllelicImbalance?.length) for (const r of data.variantAllelicImbalance) get(r.tissue_name).variantAllelicImbalance = r;
  if (data.crisprEssentiality?.length) for (const r of data.crisprEssentiality) get(r.tissue_name).crisprEssentiality = r;

  for (const t of map.values()) {
    t.convergence = [
      t.signals, t.chromatin, t.enhancers, t.accessibility, t.loops, t.ase,
      t.qtls, t.chrombpnet, t.variantAllelicImbalance, t.crisprEssentiality,
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
// Strength tiers
// ---------------------------------------------------------------------------

type Strength = "strong" | "moderate" | "low";

function classifyValue(value: number, strong: number, moderate: number): Strength {
  if (value >= strong) return "strong";
  if (value >= moderate) return "moderate";
  return "low";
}

const TIER_FILL: Record<Strength, number> = { strong: 85, moderate: 50, low: 18 };

function StrengthCell({ strength, label, detail }: { strength: Strength; label: string; detail: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-2 text-xs cursor-default">
            <span className="w-10 h-1 rounded-full bg-primary/10 overflow-hidden shrink-0">
              <span
                className={cn(
                  "block h-full rounded-full bg-primary",
                  strength === "strong" && "opacity-80",
                  strength === "moderate" && "opacity-45",
                  strength === "low" && "opacity-20",
                )}
                style={{ width: `${TIER_FILL[strength]}%` }}
              />
            </span>
            <span
              className={cn(
                "whitespace-nowrap",
                strength === "strong" && "text-foreground",
                strength === "moderate" && "text-muted-foreground",
                strength === "low" && "text-muted-foreground/50",
              )}
            >
              {label}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">{detail}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ConvergenceDots({ tissue }: { tissue: TissueEvidence }) {
  const present = EVIDENCE_TYPES.map(({ key }) => {
    const val = tissue[key as keyof TissueEvidence];
    return val != null;
  });
  const count = present.filter(Boolean).length;

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
        <TooltipContent side="top" className="text-xs min-w-[160px]">
          <p className="font-medium mb-1">{count} of {TOTAL_EVIDENCE_TYPES} data types</p>
          {EVIDENCE_TYPES.map(({ key, label }, i) => (
            <p key={key} className={cn("pl-1", !present[i] && "opacity-30")}>
              {present[i] ? "✓" : "–"} {label}
            </p>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const nullsLast: ColumnDef<TissueEvidence>["sortingFn"] = (rowA, rowB, colId) => {
  const a = rowA.getValue<number | null>(colId);
  const b = rowB.getValue<number | null>(colId);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
};

function buildColumns(): ColumnDef<TissueEvidence>[] {
  return [
    {
      id: "tissue_name",
      accessorKey: "tissue_name",
      header: "Tissue",
      enableSorting: true,
      meta: { description: "Tissue group aggregated across all biosamples. Click a row to see details and links to individual data views." },
      cell: ({ row }) => (
        <span className="text-sm font-medium text-foreground">{row.original.tissue_name}</span>
      ),
    },
    {
      id: "convergence",
      accessorKey: "convergence",
      header: "Evidence",
      enableSorting: true,
      sortDescFirst: true,
      meta: { description: "Number of independent data types (out of 10) with regulatory evidence in this tissue. More evidence types = higher confidence." },
      cell: ({ row }) => <ConvergenceDots tissue={row.original} />,
    },
    {
      id: "signals",
      accessorFn: (r) => r.signals?.max_value ?? null,
      header: "Reg. Signals",
      meta: { description: "Epigenomic signal strength at candidate regulatory elements (cCREs). Strong = Z-score ≥ 5, Moderate = 3–5, Low = < 3." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const s = row.original.signals;
        if (!s) return <Dash />;
        const strength = classifyValue(s.max_value, 5, 3);
        const label = strength === "strong" ? "High activity" : strength === "moderate" ? "Active" : "Low";
        return <StrengthCell strength={strength} label={label} detail={`Z-score ${s.max_value.toFixed(1)} across ${formatCount(s.count)} regulatory elements`} />;
      },
    },
    {
      id: "chromatin",
      accessorFn: (r) => (r.chromatin ? r.chromatin.count : null),
      header: "Chromatin",
      meta: { description: "Dominant chromatin state from the Roadmap 25-state model. Shows whether this region acts as a promoter, enhancer, or is repressed in this tissue." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.chromatin;
        if (!c) return <Dash />;
        const state = c.top_item ?? "unknown";
        const color = STATE_COLORS[state] ?? "#9ca3af";
        const displayLabel = STATE_LABELS[state] ?? state.charAt(0).toUpperCase() + state.slice(1);
        return (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1.5 text-xs cursor-default text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {displayLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {formatCount(c.count)} chromatin segments annotated as {state} in this tissue
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "accessibility",
      accessorFn: (r) => r.accessibility?.max_value ?? null,
      header: "Accessibility",
      meta: { description: "ATAC-seq/DNase accessibility peaks — open DNA accessible to transcription factors. Strong = ≥ 10× enrichment, Moderate = 5–10×, Low = < 5×." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.accessibility;
        if (!a) return <Dash />;
        const strength = classifyValue(a.max_value, 10, 5);
        const label = strength === "strong" ? "Highly open" : strength === "moderate" ? "Open" : "Low";
        return <StrengthCell strength={strength} label={label} detail={`${a.max_value.toFixed(1)}× enrichment over background across ${a.count} peaks`} />;
      },
    },
    {
      id: "enhancers",
      accessorFn: (r) => r.enhancers?.max_value ?? null,
      header: "Enhancer Links",
      meta: { description: "Enhancer-gene prediction confidence (ABC, EPIraction, EpiMap, RE2G). Strong = score ≥ 0.3, Moderate = 0.015–0.3, Low = < 0.015." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const e = row.original.enhancers;
        if (!e) return <Dash />;
        const strength = classifyValue(e.max_value, 0.3, 0.015);
        const label = strength === "strong" ? "Strong link" : strength === "moderate" ? "Linked" : "Weak";
        return <StrengthCell strength={strength} label={label} detail={`Best score ${fmtScore(e.max_value)} across ${e.count} enhancer predictions`} />;
      },
    },
    {
      id: "loops",
      accessorFn: (r) => r.loops?.count ?? null,
      header: "Loops",
      meta: { description: "Chromatin loops (Hi-C / ChIA-PET) — physical 3D contacts connecting this gene to distant regulatory elements." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const l = row.original.loops;
        if (!l) return <Dash />;
        const strength: Strength = l.count >= 5 ? "strong" : l.count >= 2 ? "moderate" : "low";
        const label = `${l.count} loop${l.count !== 1 ? "s" : ""}`;
        return <StrengthCell strength={strength} label={label} detail={`${l.count} chromatin loop${l.count !== 1 ? "s" : ""} connecting this gene to distant regulatory elements`} />;
      },
    },
    {
      id: "ase",
      accessorFn: (r) => r.ase?.max_value ?? null,
      header: "Allelic Activity",
      meta: { description: "Allele-specific epigenomic activity at regulatory elements (cCREs). Tests whether one allele shows stronger regulatory signal than the other." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.ase;
        if (!a) return <Dash />;
        const strength = classifyValue(a.max_value, 3, 1.3);
        const label = strength === "strong" ? "Significant" : strength === "moderate" ? "Suggestive" : "Not sig.";
        return <StrengthCell strength={strength} label={label} detail={`−log₁₀(p) = ${a.max_value.toFixed(1)} across ${a.count} observations${a.significant ? `, ${a.significant} significant` : ""}`} />;
      },
    },
    {
      id: "qtls",
      accessorFn: (r) => r.qtls?.count ?? null,
      header: "Expression QTLs",
      meta: { description: "eQTL/sQTL associations linking variants to gene expression changes in this tissue (GTEx, eQTL Catalogue, etc.)." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const q = row.original.qtls;
        if (!q) return <Dash />;
        const strength: Strength = q.count >= 1000 ? "strong" : q.count >= 100 ? "moderate" : "low";
        return <StrengthCell strength={strength} label={`${formatCount(q.count)} hits`} detail={`${q.count.toLocaleString()} QTL associations${q.significant ? `, ${q.significant} genome-wide significant` : ""}`} />;
      },
    },
    {
      id: "chrombpnet",
      accessorFn: (r) => r.chrombpnet?.count ?? null,
      header: "Deep Learning",
      meta: { description: "ChromBPNet deep learning predictions of how variants affect chromatin accessibility in this tissue." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.chrombpnet;
        if (!c) return <Dash />;
        const strength: Strength = c.count >= 4 ? "strong" : c.count >= 2 ? "moderate" : "low";
        return <StrengthCell strength={strength} label={`${c.count} pred.`} detail={`${c.count.toLocaleString()} ChromBPNet variant effect predictions in this tissue`} />;
      },
    },
    {
      id: "variantAllelicImbalance",
      accessorFn: (r) => r.variantAllelicImbalance?.max_value ?? null,
      header: "Histone Imbal.",
      meta: { description: "ENTEx histone modification allelic imbalance. Tests whether histone marks (e.g. H3K27ac) differ between alleles at variant positions." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const v = row.original.variantAllelicImbalance;
        if (!v) return <Dash />;
        const strength = classifyValue(v.max_value, 3, 1.3);
        const label = strength === "strong" ? "Significant" : strength === "moderate" ? "Suggestive" : "Not sig.";
        return <StrengthCell strength={strength} label={label} detail={`−log₁₀(p) = ${v.max_value.toFixed(1)} across ${v.count} observations${v.significant ? `, ${v.significant} significant` : ""}`} />;
      },
    },
    {
      id: "crisprEssentiality",
      accessorFn: (r) => r.crisprEssentiality ? (r.crisprEssentiality.significant ?? 0) / Math.max(r.crisprEssentiality.count, 1) : null,
      header: () => (
        <span className="flex flex-col leading-tight">
          <span>Essentiality</span>
          <span>CRISPR</span>
        </span>
      ),
      meta: { description: "CRISPR essentiality grouped by tissue. Shows fraction of cell lines in that tissue group where gene knockout is lethal." },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.crisprEssentiality;
        if (!c) return <Dash />;
        const sig = c.significant ?? 0;
        const pct = Math.round(sig / Math.max(c.count, 1) * 100);
        const strength: Strength = pct >= 50 ? "strong" : pct >= 20 ? "moderate" : "low";
        return <StrengthCell strength={strength} label={`${sig}/${c.count}`} detail={`Essential in ${sig} of ${c.count} cell lines (${pct}%) in ${row.original.tissue_name}`} />;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Expanded detail panel
// ---------------------------------------------------------------------------

function TissueDetail({ tissue, basePath }: { tissue: TissueEvidence; basePath: string }) {
  const tg = encodeURIComponent(tissue.tissue_name);

  const cards: { label: string; slug: string; lines: string[] }[] = [];

  if (tissue.signals)
    cards.push({ label: "cCRE Activity", slug: "tissue-signals", lines: [
      `${formatCount(tissue.signals.count)} regulatory elements`,
      `Max Z-score: ${tissue.signals.max_value.toFixed(1)}`,
      tissue.signals.top_item ? `Top cCRE: ${tissue.signals.top_item}` : "",
    ] });
  if (tissue.chromatin)
    cards.push({ label: "Chromatin States", slug: "chromatin-states", lines: [
      `${formatCount(tissue.chromatin.count)} annotated segments`,
      `Dominant: ${tissue.chromatin.top_item ?? "\u2014"}`,
    ] });
  if (tissue.enhancers)
    cards.push({ label: "Enhancer Links", slug: "enhancer-genes", lines: [
      `${tissue.enhancers.count} predictions`,
      `Best score: ${tissue.enhancers.max_value.toFixed(3)}`,
    ] });
  if (tissue.accessibility)
    cards.push({ label: "Accessibility", slug: "accessibility", lines: [
      `${tissue.accessibility.count} peaks`,
      `Best: ${tissue.accessibility.max_value.toFixed(1)}\u00d7 enrichment`,
    ] });
  if (tissue.loops)
    cards.push({ label: "Chromatin Loops", slug: "loops", lines: [
      `${tissue.loops.count} loop${tissue.loops.count !== 1 ? "s" : ""}`,
      tissue.loops.top_item ?? "",
    ] });
  if (tissue.ase)
    cards.push({ label: "Allelic Activity", slug: "allele-specific", lines: [
      `${tissue.ase.count} tested${tissue.ase.significant ? `, ${tissue.ase.significant} significant` : ""}`,
      `Best \u2212log\u2081\u2080(p): ${tissue.ase.max_value.toFixed(1)}`,
    ] });
  if (tissue.qtls)
    cards.push({ label: "Expression QTLs", slug: "qtls", lines: [
      `${tissue.qtls.count} associations${tissue.qtls.significant ? `, ${tissue.qtls.significant} significant` : ""}`,
      `Best \u2212log\u2081\u2080(p): ${tissue.qtls.max_value.toFixed(1)}`,
      tissue.qtls.top_item ? `Top gene: ${tissue.qtls.top_item}` : "",
    ] });
  if (tissue.chrombpnet)
    cards.push({ label: "ChromBPNet", slug: "chrombpnet", lines: [
      `${tissue.chrombpnet.count} predictions`,
    ] });
  if (tissue.variantAllelicImbalance)
    cards.push({ label: "Histone Imbalance", slug: "allele-specific", lines: [
      `${tissue.variantAllelicImbalance.count} observations${tissue.variantAllelicImbalance.significant ? `, ${tissue.variantAllelicImbalance.significant} significant` : ""}`,
      `Best \u2212log\u2081\u2080(p): ${tissue.variantAllelicImbalance.max_value.toFixed(1)}`,
    ] });
  if (tissue.crisprEssentiality) {
    const sig = tissue.crisprEssentiality.significant ?? 0;
    const total = tissue.crisprEssentiality.count;
    const pct = Math.round(sig / Math.max(total, 1) * 100);
    cards.push({ label: "CRISPR Essentiality", slug: "perturbation", lines: [
      `Essential in ${sig} of ${total} cell lines (${pct}%)`,
    ] });
  }

  return (
    <div className="py-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm font-medium text-foreground">{tissue.tissue_name}</span>
        <span className="text-xs text-muted-foreground">{tissue.convergence}/{TOTAL_EVIDENCE_TYPES} evidence types</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="text-xs font-medium text-foreground">{c.label}</span>
            {c.lines.filter(Boolean).map((l, i) => (
              <p key={i} className="text-xs text-muted-foreground mt-0.5">{l}</p>
            ))}
            <Link
              href={`${basePath}/${c.slug}?tissue_group=${tg}`}
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

export function TissueEvidenceSummary({ evidence, summary, basePath }: Props) {
  const all = useMemo(() => buildTissueEvidence(evidence), [evidence]);
  const columns = useMemo(() => buildColumns(), []);

  const totalRecords = summary
    ? Object.values(summary.counts).reduce((a, b) => a + b, 0)
    : null;

  const subtitle = [
    `${all.length} tissue groups ranked by evidence convergence`,
    totalRecords != null ? `\u00b7 ${formatCount(totalRecords)} total records` : null,
  ].filter(Boolean).join(" ");

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
      renderExpandedRow={(tissue) => <TissueDetail tissue={tissue} basePath={basePath} />}
    />
  );
}
