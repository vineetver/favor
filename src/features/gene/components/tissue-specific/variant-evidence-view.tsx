"use client";

import { cn } from "@infra/utils";
import type { VariantEvidenceSummaryRow } from "@features/gene/api/region";
import { formatCount } from "@shared/utils/tissue-format";
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
// Region table labels
// ---------------------------------------------------------------------------

const REGION_TABLE_LABELS: Record<string, string> = {
  enhancer_gene: "Enhancer",
  epiraction: "EPIraction",
  encode_re2g: "RE2G",
  chromatin_loops: "Loop",
  accessibility_peaks: "Peak",
  ase_ccre: "ASE",
  epimap: "EpiMap",
};

function regionLabel(table: string): string {
  return REGION_TABLE_LABELS[table] ?? table;
}

// ---------------------------------------------------------------------------
// Evidence counting
// ---------------------------------------------------------------------------

const EVIDENCE_KEYS = [
  "region_overlap_count", "qtl_count", "chrombpnet_count",
  "imbalance_count", "methylation_count", "pgs_count",
] as const;

const TOTAL_VARIANT_EVIDENCE = 7; // 6 keys above + tissue_score_max

function countEvidence(row: VariantEvidenceSummaryRow): number {
  let n = 0;
  for (const k of EVIDENCE_KEYS) if (row[k] > 0) n++;
  if (row.tissue_score_max > 0) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Strength system
// ---------------------------------------------------------------------------

type Strength = "strong" | "moderate" | "low";

function classify(value: number, strong: number, moderate: number): Strength {
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

function Dash() {
  return <span className="text-xs text-muted-foreground/30">&mdash;</span>;
}

function EvidenceDots({ count }: { count: number }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className="flex gap-[3px]">
              {Array.from({ length: TOTAL_VARIANT_EVIDENCE }, (_, i) => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < count ? "bg-primary" : "bg-border")} />
              ))}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground ml-0.5">{count}/{TOTAL_VARIANT_EVIDENCE}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          Evidence from {count} of {TOTAL_VARIANT_EVIDENCE} data types: region overlaps, QTLs, ChromBPNet, V2F scores, allelic imbalance, methylation, PGS.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<VariantEvidenceSummaryRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => (
      <Link
        href={`/hg38/variant/${encodeURIComponent(row.original.variant_vcf)}`}
        className="font-mono text-xs text-primary hover:underline whitespace-nowrap"
      >
        {row.original.variant_vcf}
      </Link>
    ),
  },
  {
    id: "evidence",
    accessorFn: (r) => countEvidence(r),
    header: "Evidence",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Number of distinct evidence categories with data (out of 7: region overlaps, QTLs, ChromBPNet, V2F scores, allelic imbalance, methylation, PGS)" } satisfies ColumnMeta,
    cell: ({ row }) => <EvidenceDots count={countEvidence(row.original)} />,
  },
  {
    id: "region_overlaps",
    accessorKey: "region_overlap_count",
    header: "Reg. Elements",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Regulatory element types this variant overlaps (enhancers, loops, peaks, ASE cCREs)" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const tables = row.original.region_tables;
      if (!tables.length) return <Dash />;
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-wrap gap-1">
                {tables.map((t) => (
                  <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                    {regionLabel(t)}
                  </span>
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              Overlaps {tables.length} regulatory element type{tables.length !== 1 ? "s" : ""}: {tables.map(regionLabel).join(", ")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "qtl_count",
    accessorKey: "qtl_count",
    header: "Expression QTLs",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "eQTL/sQTL associations across GTEx, eQTL Catalogue, and single-cell studies. Higher = more tissues/genes affected." } satisfies ColumnMeta,
    cell: ({ row }) => {
      const { qtl_count, qtl_significant } = row.original;
      if (qtl_count === 0) return <Dash />;
      const strength = classify(qtl_count, 500, 50);
      const sigNote = qtl_significant > 0 ? `, ${qtl_significant} genome-wide significant` : "";
      return <StrengthCell strength={strength} label={`${formatCount(qtl_count)} hits`} detail={`${qtl_count.toLocaleString()} QTL associations${sigNote}`} />;
    },
  },
  {
    id: "imbalance_count",
    accessorKey: "imbalance_count",
    header: "Histone Imbal.",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "ENTEx histone allelic imbalance — tests whether histone marks (H3K27ac, H3K4me1, etc.) differ between alleles at this variant." } satisfies ColumnMeta,
    cell: ({ row }) => {
      const { imbalance_count, imbalance_significant } = row.original;
      if (imbalance_count === 0) return <Dash />;
      const label = imbalance_significant > 0 ? `${imbalance_significant} sig.` : `${imbalance_count} obs.`;
      const strength: Strength = imbalance_significant > 5 ? "strong" : imbalance_significant > 0 ? "moderate" : "low";
      const sigNote = imbalance_significant > 0 ? `, ${imbalance_significant} significant` : "";
      return <StrengthCell strength={strength} label={label} detail={`${imbalance_count} histone imbalance observations${sigNote} (FDR < 0.05)`} />;
    },
  },
  {
    id: "tissue_score_max",
    accessorKey: "tissue_score_max",
    header: "Func. Score",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Max tissue-specific variant-to-function score (cV2F / TLand). 0–1, higher = more likely functional in at least one tissue." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <Dash />;
      const strength: Strength = v >= 0.5 ? "strong" : v >= 0.1 ? "moderate" : "low";
      const label = strength === "strong" ? "High" : strength === "moderate" ? "Moderate" : "Low";
      return <StrengthCell strength={strength} label={label} detail={`Max tissue score: ${v.toFixed(3)} (0–1 scale, higher = more likely functional)`} />;
    },
  },
  {
    id: "chrombpnet_count",
    accessorKey: "chrombpnet_count",
    header: "Deep Learning",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "ChromBPNet deep learning predictions — how this variant affects chromatin accessibility across tissues/experiments." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <Dash />;
      const strength = classify(v, 3, 1);
      return <StrengthCell strength={strength} label={`${v} pred.`} detail={`${v} ChromBPNet prediction${v !== 1 ? "s" : ""} of variant effect on chromatin accessibility`} />;
    },
  },
  {
    id: "pgs_count",
    accessorKey: "pgs_count",
    header: "Polygenic",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Polygenic score memberships — how many published PGS include this variant as a contributing weight." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <Dash />;
      const strength = classify(v, 50, 10);
      return <StrengthCell strength={strength} label={`${formatCount(v)} scores`} detail={`Included in ${v.toLocaleString()} polygenic score${v !== 1 ? "s" : ""} from the PGS Catalog`} />;
    },
  },
  {
    id: "methylation_count",
    accessorKey: "methylation_count",
    header: "Methylation",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "ENTEx allelic methylation — tests whether CpG methylation differs between alleles at this variant across tissues." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <Dash />;
      const strength = classify(v, 10, 3);
      return <StrengthCell strength={strength} label={`${v} obs.`} detail={`${v} allelic methylation observation${v !== 1 ? "s" : ""} across ENTEx tissues`} />;
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface VariantEvidenceViewProps {
  data: VariantEvidenceSummaryRow[];
  loc: string;
}

export function VariantEvidenceView({ data, loc }: VariantEvidenceViewProps) {
  if (data.length === 0) return null;

  return (
    <DataSurface
      title="Regulatory Variants"
      subtitle={`${data.length} variants ranked by total evidence across all data types`}
      data={data}
      columns={columns}
      searchable
      searchPlaceholder="Search variants..."
      searchColumn="variant_vcf"
      defaultPageSize={25}
      pageSizeOptions={[25, 50, 100]}
      exportable
      exportFilename={`variant-evidence-${loc}`}
      emptyMessage="No variants with regulatory evidence found in this region"
    />
  );
}
