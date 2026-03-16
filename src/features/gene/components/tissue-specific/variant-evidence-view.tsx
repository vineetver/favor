"use client";

import { cn } from "@infra/utils";
import type { VariantEvidenceSummaryRow } from "@features/gene/api/region";
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
// Readable labels for region_table values
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
// Evidence dot indicator
// ---------------------------------------------------------------------------

function EvidenceDots({ row }: { row: VariantEvidenceSummaryRow }) {
  const types = [
    { has: row.region_overlap_count > 0, label: "Region overlaps", color: "bg-primary" },
    { has: row.qtl_count > 0, label: "QTL associations", color: "bg-amber-500" },
    { has: row.chrombpnet_count > 0, label: "ChromBPNet", color: "bg-cyan-500" },
    { has: row.tissue_score_max > 0, label: "V2F scores", color: "bg-violet-500" },
    { has: row.imbalance_count > 0, label: "Allelic imbalance", color: "bg-rose-500" },
  ];
  const activeCount = types.filter((t) => t.has).length;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <div className="flex gap-[3px]">
              {types.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    t.has ? t.color : "bg-border"
                  )}
                />
              ))}
            </div>
            <span className="text-xs tabular-nums text-muted-foreground ml-0.5">
              {activeCount}/5
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {types.filter((t) => t.has).map((t) => t.label).join(", ") || "No evidence"}
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
      <div>
        <Link
          href={`/hg38/variant/${encodeURIComponent(row.original.variant_vcf)}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {row.original.variant_vcf}
        </Link>
        <span className="block text-[10px] tabular-nums text-muted-foreground">
          pos {row.original.position.toLocaleString()}
        </span>
      </div>
    ),
  },
  {
    id: "evidence",
    accessorFn: (r) => {
      let n = 0;
      if (r.region_overlap_count > 0) n++;
      if (r.qtl_count > 0) n++;
      if (r.chrombpnet_count > 0) n++;
      if (r.tissue_score_max > 0) n++;
      if (r.imbalance_count > 0) n++;
      return n;
    },
    header: "Evidence",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Number of distinct evidence categories with data (out of 5: region overlaps, QTLs, ChromBPNet, V2F scores, allelic imbalance)" } satisfies ColumnMeta,
    cell: ({ row }) => <EvidenceDots row={row.original} />,
  },
  {
    id: "region_overlaps",
    accessorKey: "region_overlap_count",
    header: "Reg. Overlaps",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Regulatory element types this variant overlaps (enhancers, loops, peaks, ASE cCREs)" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const tables = row.original.region_tables;
      if (!tables.length) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {tables.map((t) => (
            <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
              {regionLabel(t)}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "qtl_count",
    accessorKey: "qtl_count",
    header: "QTLs",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Total QTL associations across all sources. Significant = passed study-specific threshold." } satisfies ColumnMeta,
    cell: ({ row }) => {
      const { qtl_count, qtl_significant } = row.original;
      if (qtl_count === 0) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {qtl_count}
          {qtl_significant > 0 && (
            <span className="text-emerald-600 font-medium"> ({qtl_significant} sig)</span>
          )}
        </span>
      );
    },
  },
  {
    id: "imbalance_count",
    accessorKey: "imbalance_count",
    header: "Imbalance",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "ENTEx histone allelic imbalance observations. Significant = FDR < 0.05." } satisfies ColumnMeta,
    cell: ({ row }) => {
      const { imbalance_count, imbalance_significant } = row.original;
      if (imbalance_count === 0) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {imbalance_count}
          {imbalance_significant > 0 && (
            <span className="text-emerald-600 font-medium"> ({imbalance_significant} sig)</span>
          )}
        </span>
      );
    },
  },
  {
    id: "tissue_score_max",
    accessorKey: "tissue_score_max",
    header: "V2F Max",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "Max tissue-specific functional score (cV2F / TLand). 0\u20131, higher = more likely functional." } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${v * 100}%`, opacity: Math.max(0.4, v) }} />
          </div>
          <span className="text-xs tabular-nums text-foreground font-medium">{v.toFixed(2)}</span>
        </div>
      );
    },
  },
  {
    id: "chrombpnet_count",
    accessorKey: "chrombpnet_count",
    header: "ChromBP",
    enableSorting: true,
    sortDescFirst: true,
    meta: { description: "ChromBPNet deep learning variant effect predictions" } satisfies ColumnMeta,
    cell: ({ getValue }) => {
      const v = getValue() as number;
      if (v === 0) return <span className="text-muted-foreground/40">&mdash;</span>;
      return <span className="text-xs tabular-nums text-muted-foreground">{v}</span>;
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
      subtitle={`Top ${data.length} variants ranked by total evidence across all data types`}
      data={data}
      columns={columns}
      searchable={false}
      defaultPageSize={data.length}
      pageSizeOptions={[data.length]}
      exportable
      exportFilename={`variant-evidence-${loc}`}
      emptyMessage="No variants with regulatory evidence found in this region"
    />
  );
}
