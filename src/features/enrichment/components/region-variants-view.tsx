"use client";

import type {
  PaginatedResponse,
  RegionVariantRow,
} from "@features/enrichment/api/region";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Human-readable labels for region_table values
// ---------------------------------------------------------------------------

const REGION_TABLE_LABELS: Record<string, string> = {
  enhancer_gene: "Enhancer-Gene",
  epiraction: "EPIraction",
  encode_re2g: "RE2G",
  chromatin_loops: "3D Loops",
  accessibility_peaks: "Open Chromatin",
  ase_ccre: "Allelic Activity",
};

function regionTableLabel(table: string): string {
  return REGION_TABLE_LABELS[table] ?? table;
}

// ---------------------------------------------------------------------------
// Aggregate: unique variants + which tables they appear in
// ---------------------------------------------------------------------------

interface VariantSummary {
  variant_vcf: string;
  position: number;
  chrom_id: number;
  tables: string[];
  count: number;
}

function aggregateVariants(rows: RegionVariantRow[]): VariantSummary[] {
  const map = new Map<string, VariantSummary>();
  for (const row of rows) {
    const existing = map.get(row.variant_vcf);
    if (!existing) {
      map.set(row.variant_vcf, {
        variant_vcf: row.variant_vcf,
        position: row.position,
        chrom_id: row.chrom_id,
        tables: [row.region_table],
        count: 1,
      });
    } else {
      if (!existing.tables.includes(row.region_table)) {
        existing.tables.push(row.region_table);
      }
      existing.count++;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.tables.length - a.tables.length || b.count - a.count,
  );
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const summaryColumns: ColumnDef<VariantSummary>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" },
    enableSorting: true,
    cell: ({ getValue }) => {
      const vcf = getValue() as string;
      return (
        <Link
          href={`/hg38/variant/${encodeURIComponent(vcf)}`}
          className="font-mono text-xs text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {vcf}
        </Link>
      );
    },
  },
  {
    id: "position",
    accessorKey: "position",
    header: "Position",
    meta: { description: "Genomic position (hg38)" },
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {(getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    id: "tables",
    accessorFn: (row) => row.tables.length,
    header: "Regulatory Overlap",
    meta: {
      description:
        "Which regulatory data types this variant overlaps. More types = stronger regulatory context for this variant.",
    },
    enableSorting: true,
    sortDescFirst: true,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.tables.map((t) => (
          <TooltipProvider key={t} delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                  {regionTableLabel(t)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Overlaps {regionTableLabel(t)} regulatory element
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    ),
  },
  {
    id: "count",
    accessorKey: "count",
    header: "Overlaps",
    meta: {
      description:
        "Total number of regulatory element overlaps for this variant",
    },
    enableSorting: true,
    sortDescFirst: true,
    cell: ({ getValue }) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {getValue() as number}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface RegionVariantsViewProps {
  initialData: PaginatedResponse<RegionVariantRow> | null;
  loc: string;
}

export function RegionVariantsView({ initialData }: RegionVariantsViewProps) {
  const rows = initialData?.data ?? [];
  const hasMore = initialData?.page_info?.has_more ?? false;

  const summaries = useMemo(() => aggregateVariants(rows), [rows]);

  if (rows.length === 0) return null;

  const subtitle = [
    `${summaries.length} unique variants overlapping regulatory elements`,
    hasMore ? "(showing first page)" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <DataSurface
      title="Regulatory Variants"
      subtitle={subtitle}
      data={summaries}
      columns={summaryColumns}
      searchable
      searchPlaceholder="Search variants..."
      searchColumn="variant_vcf"
      defaultPageSize={10}
      pageSizeOptions={[10, 25, 50]}
      exportable
      exportFilename="regulatory-variants"
      emptyMessage="No variants found overlapping regulatory elements."
    />
  );
}
