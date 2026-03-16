"use client";

import { cn } from "@infra/utils";
import type { VariantSummaryRow, PaginatedResponse } from "@features/gene/api/region";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import type { ColumnMeta } from "@shared/components/ui/data-surface/types";
import type { ServerPaginationInfo } from "@shared/hooks";
import { useServerTable, useClientSearchParams } from "@shared/hooks";
import type { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

// ---------------------------------------------------------------------------
// Client fetch
// ---------------------------------------------------------------------------

interface VariantScanFilters {
  cursor?: string;
  limit?: number;
  cadd_phred_min?: number;
  clinvar_clnsig?: string;
  gencode_consequence?: string;
}

async function fetchVariantsClient(
  gene: string,
  filters: VariantScanFilters,
): Promise<PaginatedResponse<VariantSummaryRow>> {
  const params = new URLSearchParams();
  params.set("gene", gene);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.cadd_phred_min != null) params.set("cadd_phred_min", String(filters.cadd_phred_min));
  if (filters.clinvar_clnsig) params.set("clinvar_clnsig", filters.clinvar_clnsig);
  if (filters.gencode_consequence) params.set("gencode_consequence", filters.gencode_consequence);
  params.set("limit", String(filters.limit ?? 25));
  const res = await fetch(`/api/v1/variants?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function parseFilters(sp: URLSearchParams): VariantScanFilters {
  const f: VariantScanFilters = {};
  const cursor = sp.get("v_cursor");
  if (cursor) f.cursor = cursor;
  const cadd = sp.get("cadd_phred_min");
  if (cadd) f.cadd_phred_min = Number(cadd);
  const clnsig = sp.get("clinvar_clnsig");
  if (clnsig) f.clinvar_clnsig = clnsig;
  const consequence = sp.get("gencode_consequence");
  if (consequence) f.gencode_consequence = consequence;
  const pageSize = sp.get("v_page_size");
  f.limit = pageSize ? Number(pageSize) : 25;
  return f;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtAf(v: number | null | undefined): string {
  if (v == null) return "\u2014";
  if (v === 0) return "0";
  if (v < 0.001) return v.toExponential(1);
  return v.toFixed(4);
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<VariantSummaryRow, unknown>[] = [
  {
    id: "variant_vcf",
    accessorKey: "variant_vcf",
    header: "Variant",
    enableSorting: false,
    meta: { description: "Variant in VCF notation (chr-pos-ref-alt)" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const vcf = row.original.variant_vcf;
      const rsid = row.original.dbsnp?.rsid;
      return (
        <div>
          <Link
            href={`/hg38/variant/${encodeURIComponent(vcf)}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {vcf}
          </Link>
          {rsid && (
            <span className="block text-[10px] text-muted-foreground">{rsid}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "consequence",
    accessorFn: (r) => r.genecode?.consequence ?? r.genecode?.region_type,
    header: "Consequence",
    enableSorting: false,
    meta: { description: "GENCODE functional consequence or region type" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const consequence = row.original.genecode?.consequence;
      const region = row.original.genecode?.region_type;
      const label = consequence ?? region;
      if (!label) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className={cn(
          "text-xs",
          consequence === "missense_variant" || consequence === "stop_gained"
            ? "text-destructive font-medium"
            : consequence === "synonymous_variant"
              ? "text-muted-foreground"
              : "text-foreground",
        )}>
          {label.replace(/_/g, " ")}
        </span>
      );
    },
  },
  {
    id: "gnomad_af",
    accessorFn: (r) => r.gnomad_genome?.af ?? r.gnomad_exome?.af,
    header: "gnomAD AF",
    enableSorting: false,
    meta: { description: "gnomAD allele frequency (genome or exome)" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const af = row.original.gnomad_genome?.af ?? row.original.gnomad_exome?.af;
      return (
        <span className="text-xs tabular-nums text-muted-foreground">
          {fmtAf(af)}
        </span>
      );
    },
  },
  {
    id: "cadd_phred",
    accessorFn: (r) => r.main?.cadd_phred,
    header: "CADD",
    enableSorting: false,
    meta: { description: "CADD Phred-scaled score. >20 = top 1% most deleterious, >30 = top 0.1%" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const v = row.original.main?.cadd_phred;
      if (v == null) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className={cn(
          "text-xs tabular-nums font-medium",
          v >= 30 ? "text-destructive" : v >= 20 ? "text-amber-600" : "text-muted-foreground",
        )}>
          {v.toFixed(1)}
        </span>
      );
    },
  },
  {
    id: "clinvar",
    accessorFn: (r) => r.clinvar?.clnsig?.[0],
    header: "ClinVar",
    enableSorting: false,
    meta: { description: "ClinVar clinical significance" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const sigs = row.original.clinvar?.clnsig;
      if (!sigs?.length) return <span className="text-muted-foreground/40">&mdash;</span>;
      const sig = sigs[0];
      return (
        <span className={cn(
          "text-xs",
          sig.includes("Pathogenic") ? "text-destructive font-medium"
            : sig.includes("Likely_pathogenic") ? "text-amber-600 font-medium"
              : sig.includes("Benign") ? "text-emerald-600"
                : "text-muted-foreground",
        )}>
          {sig.replace(/_/g, " ")}
        </span>
      );
    },
  },
  {
    id: "sift_polyphen",
    accessorFn: (r) => r.main?.protein_predictions?.sift_cat,
    header: "SIFT / PolyPhen",
    enableSorting: false,
    meta: { description: "SIFT and PolyPhen protein impact predictions" } satisfies ColumnMeta,
    cell: ({ row }) => {
      const sift = row.original.main?.protein_predictions?.sift_cat;
      const pp = row.original.main?.protein_predictions?.polyphen_cat;
      if (!sift && !pp) return <span className="text-muted-foreground/40">&mdash;</span>;
      return (
        <span className="text-xs text-muted-foreground">
          {[sift, pp].filter(Boolean).join(" / ")}
        </span>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface GeneVariantsViewProps {
  gene: string;
  initialData: PaginatedResponse<VariantSummaryRow> | null;
}

export function GeneVariantsView({ gene, initialData }: GeneVariantsViewProps) {
  const searchParams = useClientSearchParams();
  const isFirstMount = useRef(true);
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const query = useQuery({
    queryKey: ["gene-variants", gene, filters],
    queryFn: () => fetchVariantsClient(gene, filters),
    placeholderData: isFirstMount.current && initialData
      ? initialData
      : (prev: PaginatedResponse<VariantSummaryRow> | undefined) => prev,
    staleTime: 30 * 1000,
  });

  useEffect(() => { isFirstMount.current = false; }, []);

  const data = query.data?.data ?? [];
  const pageInfo = query.data?.page_info;
  const total = pageInfo?.total_count ?? null;

  const paginationInfo: ServerPaginationInfo = {
    totalCount: total ?? undefined,
    pageSize: 25,
    hasMore: pageInfo?.has_more ?? false,
    currentCursor: pageInfo?.next_cursor ?? null,
  };

  const tableState = useServerTable({
    filters: [],
    serverPagination: true,
    paginationInfo,
  });

  if (!initialData && !query.data && !query.isLoading) return null;

  const subtitle = total != null
    ? `${total.toLocaleString()} variants in the ${gene} region`
    : `Variants in the ${gene} region`;

  return (
    <DataSurface
      title="Gene Region Variants"
      subtitle={subtitle}
      data={data}
      columns={columns}
      searchable={false}
      exportable
      exportFilename={`variants-${gene}`}
      loading={query.isLoading && data.length === 0}
      transitioning={query.isFetching && data.length > 0}
      serverPagination={tableState.pagination}
      pageSizeOptions={[25, 50, 100]}
      emptyMessage="No variants found in this gene region"
    />
  );
}
