"use client";

import { cn } from "@infra/utils";
import type { TargetGeneEvidence } from "@features/enrichment/api/region";
import { formatTissueName } from "@shared/utils/tissue-format";
import { Dash } from "@shared/components/ui/dash";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Strength tiers (same system as TissueEvidenceSummary)
// ---------------------------------------------------------------------------

type Strength = "strong" | "moderate" | "low";

const TIER_FILL: Record<Strength, number> = {
  strong: 85,
  moderate: 50,
  low: 18,
};

function classify(value: number, strong: number, moderate: number): Strength {
  if (value >= strong) return "strong";
  if (value >= moderate) return "moderate";
  return "low";
}

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
// Source & category definitions
// ---------------------------------------------------------------------------

const ALL_SOURCES = [
  // QTL (blue)
  { source: "gtex", label: "GTEx eQTL", category: "qtl" },
  { source: "gtex_susie", label: "SuSiE", category: "qtl" },
  { source: "sqtl", label: "sQTL", category: "qtl" },
  { source: "apaqtl", label: "APA-QTL", category: "qtl" },
  { source: "eqtl_catalogue", label: "eQTL Catalogue", category: "qtl" },
  { source: "sc_eqtl", label: "sc-eQTL", category: "qtl" },
  // Enhancer-gene (purple)
  { source: "abc", label: "ABC", category: "enhancer_gene" },
  { source: "epiraction", label: "EPIraction", category: "enhancer_gene" },
  { source: "epimap", label: "EpiMap", category: "enhancer_gene" },
  { source: "re2g", label: "ENCODE rE2G", category: "enhancer_gene" },
  { source: "genehancer", label: "GeneHancer", category: "enhancer_gene" },
  // cCRE Links (orange) — ENCODE SCREEN cCRE-Gene Associations
  { source: "screen_v4", label: "SCREEN v4", category: "ccre_links" },
  { source: "chiapet", label: "ChIA-PET", category: "ccre_links" },
  { source: "crispr", label: "CRISPR", category: "ccre_links" },
  { source: "eqtl_ccre", label: "cCRE-eQTL", category: "ccre_links" },
  // Computational (teal)
  { source: "chrombpnet", label: "ChromBPNet", category: "computational" },
  // Perturbation (red) — derived from perturbation fields, not sources array
  { source: "crispr_essentiality", label: "CRISPR Essentiality", category: "perturbation" },
  { source: "perturb_seq", label: "Perturb-seq", category: "perturbation" },
] as const;

const CATEGORY_META: Record<string, { label: string; style: string }> = {
  qtl: { label: "QTL", style: "bg-blue-500/10 text-blue-700" },
  enhancer_gene: { label: "Enhancer-Gene", style: "bg-violet-500/10 text-violet-700" },
  ccre_links: { label: "cCRE Links", style: "bg-amber-500/10 text-amber-700" },
  computational: { label: "Computational", style: "bg-teal-500/10 text-teal-700" },
  perturbation: { label: "Perturbation", style: "bg-red-500/10 text-red-700" },
};

function categoryStyle(cat: string): string {
  const key = cat === "chromatin3d" ? "ccre_links" : cat;
  return CATEGORY_META[key]?.style ?? "bg-muted text-muted-foreground";
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmtScore(v: number): string {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtPvalue(neglogp: number): string {
  if (neglogp >= 100) return "<1e-100";
  const p = Math.pow(10, -neglogp);
  return p < 0.001 ? p.toExponential(1) : p.toFixed(3);
}

// ---------------------------------------------------------------------------
// Expanded row — per-source breakdown
// ---------------------------------------------------------------------------

function GeneDetail({ gene }: { gene: TargetGeneEvidence }) {
  return (
    <div className="py-3 space-y-3">
      {/* Top tissues */}
      {(gene.top_tissues?.length ?? 0) > 0 && (
        <div>
          <span className="text-xs font-medium text-foreground">
            Top tissues
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {gene.top_tissues.map((t, i) => (
              <span
                key={`${t.tissue}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                  t.significant
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-muted text-muted-foreground",
                )}
                title={[
                  t.best_neglog_p != null
                    ? `−log₁₀(p) = ${t.best_neglog_p.toFixed(1)}`
                    : null,
                  t.best_score != null
                    ? `score = ${fmtScore(t.best_score)}`
                    : null,
                  `Sources: ${t.sources.join(", ")}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {t.significant && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
                {formatTissueName(t.tissue)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-source breakdown */}
      <div>
        <span className="text-xs font-medium text-foreground">
          Source detail
        </span>
        <div className="mt-1.5 grid grid-cols-2 lg:grid-cols-3 gap-2">
          {gene.sources.map((s, i) => (
            <div
              key={`${s.source}-${i}`}
              className="rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span
                className={cn(
                  "inline-flex px-1.5 py-0.5 rounded text-[11px] mb-1",
                  categoryStyle(s.category),
                )}
              >
                {s.label}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.associations ?? 0} association
                {(s.associations ?? 0) !== 1 ? "s" : ""} across{" "}
                {s.tissues ?? 0} tissue
                {(s.tissues ?? 0) !== 1 ? "s" : ""}
              </p>
              {s.significant > 0 && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {s.significant} significant
                </p>
              )}
              {s.best_neglog_p != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Best −log₁₀(p): {s.best_neglog_p.toFixed(1)}
                </p>
              )}
              {s.best_score != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Best score: {fmtScore(s.best_score)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const TOTAL_SOURCES = ALL_SOURCES.length; // 18
const CATEGORIES = ["qtl", "enhancer_gene", "ccre_links", "computational", "perturbation"] as const;

/** Build the full set of present sources, including perturbation derived from row fields */
function getPresentSources(row: TargetGeneEvidence): Set<string> {
  const present = new Set((row.sources ?? []).map((s) => s.source));
  if (row.crispr_total != null && row.crispr_total > 0) {
    present.add("crispr_essentiality");
  }
  if (row.perturb_seq_downstream_genes != null && row.perturb_seq_downstream_genes > 0) {
    present.add("perturb_seq");
  }
  return present;
}

const columns: ColumnDef<TargetGeneEvidence, unknown>[] = [
  {
    id: "gene_symbol",
    accessorKey: "gene_symbol",
    header: "Gene",
    enableSorting: false,
    meta: {
      description:
        "Target gene linked to this variant through regulatory evidence",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const gene = getValue() as string;
      return (
        <Link
          href={`/hg38/gene/${encodeURIComponent(gene)}`}
          className="text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {gene}
        </Link>
      );
    },
  },
  {
    id: "evidence",
    accessorFn: (r) => getPresentSources(r).size,
    header: "Evidence",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "Sources with evidence for this gene. Filled dot = source present, empty = not covered.",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const present = getPresentSources(row.original);
      const filled = present.size;
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col gap-[3px]">
                  <div className="flex gap-[3px]">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < filled ? "bg-primary" : "bg-border")} />
                    ))}
                  </div>
                  <div className="flex gap-[3px]">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div key={i + 9} className={cn("w-1.5 h-1.5 rounded-full", i + 9 < filled ? "bg-primary" : "bg-border")} />
                    ))}
                  </div>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {filled}/{TOTAL_SOURCES}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs min-w-[180px]">
              <p className="font-medium mb-2">{filled} of {TOTAL_SOURCES} sources</p>
              {CATEGORIES.map((cat) => {
                const catSources = ALL_SOURCES.filter((s) => s.category === cat);
                const catLabel = CATEGORY_META[cat]?.label ?? cat;
                return (
                  <div key={cat} className="mb-1.5 last:mb-0">
                    <p className="font-medium opacity-70 mb-0.5">{catLabel}</p>
                    {catSources.map((s) => {
                      const active = present.has(s.source);
                      return (
                        <p key={s.source} className={cn("pl-2", !active && "opacity-30")}>
                          {active ? "✓" : "–"} {s.label}
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "top_tissues",
    accessorKey: "tissue_count",
    header: "Top Tissues",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "Top tissues with the strongest evidence for this variant→gene link. Green dot = significant.",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const tissues = row.original.top_tissues ?? [];
      if (tissues.length === 0) return <Dash />;
      const shown = tissues.slice(0, 3);
      const remaining = tissues.length - shown.length;
      return (
        <div className="flex flex-wrap items-center gap-1">
          {shown.map((t, i) => (
            <TooltipProvider key={`${t.tissue}-${i}`} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] cursor-default max-w-[140px]",
                      t.significant
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.significant && (
                      <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">
                      {formatTissueName(t.tissue)}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-xs">
                  <p className="font-medium">{formatTissueName(t.tissue)}</p>
                  <p>Sources: {t.sources.join(", ")}</p>
                  {t.best_score != null && (
                    <p>Best score: {fmtScore(t.best_score)}</p>
                  )}
                  {t.best_neglog_p != null && (
                    <p>Best p-value: {fmtPvalue(t.best_neglog_p)}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {remaining > 0 && (
            <span className="text-[11px] text-muted-foreground">
              +{remaining}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "tissue_count",
    accessorKey: "tissue_count",
    header: "Tissues",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "Distinct tissues with evidence for this variant→gene link",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const v = row.original.tissue_count;
      const strength = classify(v, 50, 10);
      return (
        <StrengthCell
          strength={strength}
          label={`${v}`}
          detail={`Evidence in ${v} distinct tissue${v !== 1 ? "s" : ""}`}
        />
      );
    },
  },
  {
    id: "max_score",
    accessorKey: "max_score",
    header: "Best Score",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "Highest score from any source. Scores are not comparable across methods (ABC: 0–1 probability, ChIA-PET: interaction count, GeneHancer: confidence, SCREEN: 0–1 probability).",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const sources = row.original.sources ?? [];
      const best = sources.reduce<{ label: string; score: number } | null>(
        (acc, s) => {
          if (s.best_score == null) return acc;
          if (!acc || s.best_score > acc.score)
            return { label: s.label, score: s.best_score };
          return acc;
        },
        null,
      );
      if (!best) return <Dash />;
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-foreground tabular-nums cursor-default">
                {fmtScore(best.score)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              <p>{fmtScore(best.score)} from {best.label}</p>
              <p className="opacity-60">Scores vary by method and are not directly comparable</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "max_neglog_p",
    accessorKey: "max_neglog_p",
    header: "Best p-value",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description: "Strongest QTL p-value across all sources",
    } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      if (v == null) return <Dash />;
      const strength = classify(v, 8, 3);
      return (
        <StrengthCell
          strength={strength}
          label={fmtPvalue(v)}
          detail={`−log₁₀(p) = ${v.toFixed(1)}${v >= 8 ? " (genome-wide significant)" : ""}`}
        />
      );
    },
  },
  {
    id: "significant_count",
    accessorKey: "significant_count",
    header: "Sig. QTLs",
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "QTL associations passing their study's significance or credible set threshold. Non-QTL sources (enhancer, cCRE, computational) contribute through scores instead.",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const sig = row.original.significant_count;
      if (sig === 0) return <Dash />;
      const strength: Strength =
        sig >= 10 ? "strong" : sig >= 3 ? "moderate" : "low";
      return (
        <StrengthCell
          strength={strength}
          label={`${sig}`}
          detail={`${sig} QTL association${sig !== 1 ? "s" : ""} passed significance/credible set thresholds`}
        />
      );
    },
  },
  {
    id: "essential_crispr",
    accessorFn: (r) => r.crispr_significant ?? null,
    header: () => (
      <span className="flex flex-col leading-tight">
        <span>Essential</span>
        <span>CRISPR</span>
      </span>
    ),
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "CRISPR essentiality across cell lines. Shows how many screens found this gene essential out of total screens tested.",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const total = row.original.crispr_total;
      const sig = row.original.crispr_significant;
      if (total == null || total === 0) return <Dash />;
      if (sig == null || sig === 0) {
        return (
          <span className="text-xs text-muted-foreground">Non-essential</span>
        );
      }
      const strength: Strength =
        sig >= 50 ? "strong" : sig >= 10 ? "moderate" : "low";
      return (
        <StrengthCell
          strength={strength}
          label={`Essential ${sig}/${total}`}
          detail={`Essential in ${sig} of ${total} CRISPR screens`}
        />
      );
    },
  },
  {
    id: "ko_targets",
    accessorFn: (r) => r.perturb_seq_downstream_genes ?? null,
    header: () => (
      <span className="flex flex-col leading-tight">
        <span>KO Targets</span>
        <span>Perturb-seq</span>
      </span>
    ),
    enableSorting: true,
    sortDescFirst: true,
    meta: {
      description:
        "Downstream genes significantly affected when this target gene is knocked out (perturb-seq). Shows how many genes are causally affected if this variant disrupts its target.",
    } satisfies ColumnMeta,
    cell: ({ row }) => {
      const n = row.original.perturb_seq_downstream_genes;
      if (n == null || n === 0) return <Dash />;
      const topGenes = row.original.perturb_seq_top_genes;
      const strength: Strength =
        n >= 100 ? "strong" : n >= 20 ? "moderate" : "low";
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 cursor-default">
                <span className="inline-flex items-center gap-2 text-xs">
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
                    {n} genes
                  </span>
                </span>
                {topGenes && topGenes.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/70 truncate max-w-[160px]">
                    top: {topGenes.slice(0, 2).join(", ")}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              {n} downstream genes causally affected if this variant disrupts {row.original.gene_symbol}
              {topGenes && topGenes.length > 0 && (
                <p className="mt-1">Top targets: {topGenes.join(", ")}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface TargetGenesViewProps {
  data: TargetGeneEvidence[];
  variantVcf: string;
}

export function TargetGenesView({ data, variantVcf }: TargetGenesViewProps) {
  if (data.length === 0) return null;

  // Sort by total evidence count (including perturbation sources) descending
  const sorted = [...data].sort(
    (a, b) => getPresentSources(b).size - getPresentSources(a).size,
  );

  return (
    <DataSurface
      title="Target Genes"
      subtitle={`${sorted.length} genes ranked by regulatory evidence linking them to this variant`}
      data={sorted}
      columns={columns}
      searchable={false}
      defaultPageSize={25}
      pageSizeOptions={[25, 50]}
      exportable
      exportFilename={`target-genes-${variantVcf}`}
      emptyMessage="No target gene evidence found for this variant"
      renderExpandedRow={(gene) => <GeneDetail gene={gene} />}
    />
  );
}
