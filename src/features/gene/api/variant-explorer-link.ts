// src/features/gene/api/variant-explorer-link.ts
//
// Pure URL builder for Variant Explorer deep links.
//
// Server-safe (no React, no Next runtime). Both server pages and client
// components import this. The filter set is derived from ARRAY_FIELDS /
// NUMERIC_FIELDS in variant-scan.ts so adding a new explorer filter
// automatically extends what's deep-linkable.

import {
  ARRAY_FIELDS,
  NUMERIC_FIELDS,
  type VariantScanFilterOptions,
} from "@features/gene/api/variant-scan";

/**
 * Scope discriminator used by the statistics page to know whether it's
 * rendering for a gene or a region. Defined here (not in the component)
 * so the URL builder is React-free and can be imported from server code.
 */
export type VariantSummaryScope =
  | { kind: "gene"; geneSymbol: string }
  | {
      kind: "region";
      loc: string;
      // bins is optional and not used by buildExplorerHref — it lives on
      // the scope object purely so the statistics component can read it
      // when rendering the region-only spatial strip.
      bins?: unknown;
    };

/** Filters safe to encode into a Variant Explorer deep link. */
export type ExplorerFilters = Pick<
  VariantScanFilterOptions,
  (typeof ARRAY_FIELDS)[number] | (typeof NUMERIC_FIELDS)[number]
>;

/**
 * Build a Variant Explorer href with deep-link filters pre-applied.
 *
 *   buildExplorerHref({ kind: "gene", geneSymbol: "BRCA1" }, {
 *     clinvar_clnsig: ["Pathogenic", "Likely_pathogenic"],
 *     gnomad_genome_af_max: 0.001,
 *     gencode_region_type: ["exonic"],
 *   })
 *   // → "/hg38/gene/BRCA1/variants/variant-explorer
 *   //    ?clinvar_clnsig=Pathogenic,Likely_pathogenic
 *   //    &gnomad_genome_af_max=0.001
 *   //    &gencode_region_type=exonic"
 *
 * Multiselect filters → comma-separated. Numeric → bare. Matches the
 * URL convention parsed by `parseVariantScanFiltersFromUrl`.
 */
export function buildExplorerHref(
  scope: VariantSummaryScope,
  filters: ExplorerFilters,
): string {
  const base =
    scope.kind === "gene"
      ? `/hg38/gene/${encodeURIComponent(scope.geneSymbol)}/variants/variant-explorer`
      : `/hg38/region/${encodeURIComponent(scope.loc)}/variants/variant-explorer`;

  const params = new URLSearchParams();

  for (const key of ARRAY_FIELDS) {
    const v = filters[key];
    if (v && v.length) params.set(key, v.join(","));
  }
  for (const key of NUMERIC_FIELDS) {
    const v = filters[key];
    if (v !== undefined && v !== null) params.set(key, String(v));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
