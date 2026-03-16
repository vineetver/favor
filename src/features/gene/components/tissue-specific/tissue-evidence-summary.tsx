"use client";

import { cn } from "@infra/utils";
import type { RegionSummary, TissueGroupRow } from "@features/gene/api/region";
import { inferTissueGroup, formatCount, fmtScore } from "@shared/utils/tissue-format";
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
// Strength tiers — monochrome, opacity-scaled
// ---------------------------------------------------------------------------

type Strength = "strong" | "moderate" | "low";

function classifyValue(
  value: number,
  strongThreshold: number,
  moderateThreshold: number,
): Strength {
  if (value >= strongThreshold) return "strong";
  if (value >= moderateThreshold) return "moderate";
  return "low";
}

// ---------------------------------------------------------------------------
// Cell renderers
// ---------------------------------------------------------------------------

/**
 * Monochrome strength cell: tiny bar (width = relative magnitude) + label.
 * Strong = full text, moderate = muted, low = faint.
 */
/** Fixed bar width per tier so bar and label always agree visually. */
const TIER_FILL: Record<Strength, number> = { strong: 85, moderate: 50, low: 18 };

function StrengthCell({
  strength,
  label,
  detail,
}: {
  strength: Strength;
  label: string;
  detail: string;
}) {
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
        <TooltipContent side="top" className="text-xs max-w-xs">
          {detail}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

function buildColumns(): ColumnDef<TissueEvidence>[] {
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
          "Number of independent data types (out of 9) with regulatory evidence in this tissue. More evidence types = higher confidence.",
      },
      cell: ({ row }) => (
        <ConvergenceDots count={row.original.convergence} />
      ),
    },
    // ---- Epigenomic Activity columns ----
    {
      id: "signals",
      accessorFn: (r) => r.signals?.max_value ?? null,
      header: "Reg. Signals",
      meta: {
        description:
          "Epigenomic signal strength at candidate regulatory elements (cCREs). Strong = Z-score ≥ 5, Moderate = 3–5, Low = < 3.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const s = row.original.signals;
        if (!s) return <Dash />;
        const strength = classifyValue(s.max_value, 5, 3);
        const label = strength === "strong" ? "High activity" : strength === "moderate" ? "Active" : "Low";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`Z-score ${s.max_value.toFixed(1)} across ${formatCount(s.count)} regulatory elements`}
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
          "Dominant chromatin state from the Roadmap 25-state model. Shows whether this region acts as a promoter, enhancer, or is repressed in this tissue.",
      },
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
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
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
      meta: {
        description:
          "ATAC-seq/DNase accessibility peaks — open DNA accessible to transcription factors. Strong = ≥ 10× enrichment, Moderate = 5–10×, Low = < 5×.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.accessibility;
        if (!a) return <Dash />;
        const strength = classifyValue(a.max_value, 10, 5);
        const label = strength === "strong" ? "Highly open" : strength === "moderate" ? "Open" : "Low";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`${a.max_value.toFixed(1)}× enrichment over background across ${a.count} peaks`}
          />
        );
      },
    },
    // ---- Regulatory Connection columns ----
    {
      id: "enhancers",
      accessorFn: (r) => r.enhancers?.max_value ?? null,
      header: "Enhancer Links",
      meta: {
        description:
          "Enhancer-gene prediction confidence (ABC, EPIraction, EpiMap, RE2G). Strong = score ≥ 0.3, Moderate = 0.015–0.3, Low = < 0.015.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const e = row.original.enhancers;
        if (!e) return <Dash />;
        const strength = classifyValue(e.max_value, 0.3, 0.015);
        const label = strength === "strong" ? "Strong link" : strength === "moderate" ? "Linked" : "Weak";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`Best score ${fmtScore(e.max_value)} across ${e.count} enhancer predictions`}
          />
        );
      },
    },
    {
      id: "loops",
      accessorFn: (r) => r.loops?.count ?? null,
      header: "Loops",
      meta: {
        description:
          "Chromatin loops (Hi-C / ChIA-PET) — physical 3D contacts connecting this gene to distant regulatory elements.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const l = row.original.loops;
        if (!l) return <Dash />;
        const strength = l.count >= 5 ? "strong" as Strength : l.count >= 2 ? "moderate" as Strength : "low" as Strength;
        const label = `${l.count} loop${l.count !== 1 ? "s" : ""}`;
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`${l.count} chromatin loop${l.count !== 1 ? "s" : ""} connecting this gene to distant regulatory elements`}
          />
        );
      },
    },
    {
      id: "ase",
      accessorFn: (r) => r.ase?.max_value ?? null,
      header: "Allelic Activity",
      meta: {
        description:
          "Allele-specific epigenomic activity at regulatory elements (cCREs). Tests whether one allele shows stronger regulatory signal than the other.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const a = row.original.ase;
        if (!a) return <Dash />;
        const strength = classifyValue(a.max_value, 3, 1.3);
        const label = strength === "strong" ? "Significant" : strength === "moderate" ? "Suggestive" : "Not sig.";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`−log₁₀(p) = ${a.max_value.toFixed(1)} across ${a.count} observations${a.significant ? `, ${a.significant} significant` : ""}`}
          />
        );
      },
    },
    // ---- Variant Effect columns ----
    {
      id: "qtls",
      accessorFn: (r) => r.qtls?.count ?? null,
      header: "Expression QTLs",
      meta: {
        description:
          "eQTL/sQTL associations linking variants to gene expression changes in this tissue (GTEx, eQTL Catalogue, etc.).",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const q = row.original.qtls;
        if (!q) return <Dash />;
        const strength = q.count >= 1000 ? "strong" as Strength : q.count >= 100 ? "moderate" as Strength : "low" as Strength;
        const label = formatCount(q.count) + " hits";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`${q.count.toLocaleString()} QTL associations${q.significant ? `, ${q.significant} genome-wide significant` : ""}`}
          />
        );
      },
    },
    {
      id: "chrombpnet",
      accessorFn: (r) => r.chrombpnet?.count ?? null,
      header: "Deep Learning",
      meta: {
        description:
          "ChromBPNet deep learning predictions of how variants affect chromatin accessibility in this tissue.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const c = row.original.chrombpnet;
        if (!c) return <Dash />;
        const strength = c.count >= 4 ? "strong" as Strength : c.count >= 2 ? "moderate" as Strength : "low" as Strength;
        const label = `${c.count} pred.`;
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`${c.count.toLocaleString()} ChromBPNet variant effect predictions in this tissue`}
          />
        );
      },
    },
    {
      id: "variantAllelicImbalance",
      accessorFn: (r) => r.variantAllelicImbalance?.max_value ?? null,
      header: "Histone Imbal.",
      meta: {
        description:
          "ENTEx histone modification allelic imbalance. Tests whether histone marks (e.g. H3K27ac) differ between alleles at variant positions.",
      },
      enableSorting: true,
      sortingFn: nullsLast,
      cell: ({ row }) => {
        const v = row.original.variantAllelicImbalance;
        if (!v) return <Dash />;
        const strength = classifyValue(v.max_value, 3, 1.3);
        const label = strength === "strong" ? "Significant" : strength === "moderate" ? "Suggestive" : "Not sig.";
        return (
          <StrengthCell
            strength={strength}
            label={label}

            detail={`−log₁₀(p) = ${v.max_value.toFixed(1)} across ${v.count} observations${v.significant ? `, ${v.significant} significant` : ""}`}
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
        `${formatCount(tissue.signals.count)} regulatory elements`,
        `Max Z-score: ${tissue.signals.max_value.toFixed(1)}`,
        tissue.signals.top_item ? `Top cCRE: ${tissue.signals.top_item}` : "",
      ],
    });
  if (tissue.chromatin)
    cards.push({
      label: "Chromatin States",
      slug: "chromatin-states",
      lines: [
        `${formatCount(tissue.chromatin.count)} annotated segments`,
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
        tissue.qtls.top_item ? `Top gene: ${tissue.qtls.top_item}` : "",
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
      slug: "allele-specific",
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
          {tissue.convergence}/{TOTAL_EVIDENCE_TYPES} evidence types
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map((c) => {
          const href = `${basePath}/${c.slug}?tissue_group=${tg}`;

          return (
            <div
              key={c.label}
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

  const columns = useMemo(() => buildColumns(), []);

  const totalRecords = summary
    ? Object.values(summary.counts).reduce((a, b) => a + b, 0)
    : null;

  const subtitle = [
    `${all.length} tissue groups ranked by evidence convergence`,
    totalRecords != null ? `\u00b7 ${formatCount(totalRecords)} total records` : null,
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
