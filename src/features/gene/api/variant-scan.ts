import { fetchOrNull } from "@infra/api";
import type { Variant } from "@features/variant/types";

import { API_BASE } from "@/config/api";

// ============================================================================
// Types
// ============================================================================

export interface VariantScanFilterOptions {
  /** When "region", uses ?region= instead of ?gene= */
  scope?: "gene" | "region";
  limit?: number;
  cursor?: string;
  sort_by?: string;
  sort_direction?: string;
  // Variant structural class — SNV / Indel / MNV breakdown
  variant_class?: string[];
  // Frequency filters
  bravo_af_min?: number;
  bravo_af_max?: number;
  gnomad_genome_af_min?: number;
  gnomad_genome_af_max?: number;
  gnomad_exome_af_min?: number;
  gnomad_exome_af_max?: number;
  // Region/consequence filters
  gencode_region_type?: string[];
  gencode_consequence?: string[];
  refseq_region_type?: string[];
  refseq_consequence?: string[];
  ucsc_region_type?: string[];
  ucsc_consequence?: string[];
  // Clinical filters
  clinvar_clnsig?: string[];
  clinvar_review_status?: string[];
  clinvar_origin?: string[];
  // Prediction filters
  cadd_phred_min?: number;
  sift_cat?: string[];
  polyphen_cat?: string[];
  alphamissense_class?: string[];
  dbnsfp_metasvm_pred?: string[];
  aloft_description?: string[];
  funseq_description?: string[];
  // Score filters
  revel_max_genome_min?: number;
  revel_max_exome_min?: number;
  spliceai_max_genome_min?: number;
  spliceai_max_exome_min?: number;
  pangolin_max_genome_min?: number;
  pangolin_max_exome_min?: number;
  alphamissense_max_min?: number;
  linsight_min?: number;
  fathmm_xf_min?: number;
  apc_conservation_min?: number;
  phylop_min?: number;
  // COSMIC
  cosmic_tier?: string[];
  cosmic_is_canonical?: string[];
  cosmic_so_term?: string[];
}

export interface PageInfo {
  next_cursor: string | null;
  count: number;
  has_more: boolean;
  total_count?: number;
}

interface VariantScanApiResponse {
  data: Variant[];
  page_info: PageInfo;
}

export interface VariantScanResult {
  data: Variant[];
  pageInfo: PageInfo | null;
}

// ============================================================================
// URL Builder
// ============================================================================

function appendNumeric(
  params: URLSearchParams,
  key: string,
  value: number | undefined,
) {
  if (value !== undefined) params.set(key, String(value));
}

function appendArray(
  params: URLSearchParams,
  key: string,
  values: string[] | undefined,
) {
  // Backend expects comma-separated values for array params, NOT repeated
  // keys (`?k=a&k=b` returns 400). This matches the URL state convention
  // used by useServerTable + parseVariantScanFiltersFromUrl, so the format
  // is consistent end-to-end.
  if (values?.length) {
    params.set(key, values.join(","));
  }
}

function buildVariantScanUrl(
  geneOrRegion: string,
  options: VariantScanFilterOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.scope === "region") {
    params.set("region", geneOrRegion);
  } else {
    params.set("gene", geneOrRegion);
  }
  params.set("limit", String(options.limit ?? 20));

  if (options.cursor) params.set("cursor", options.cursor);
  if (options.sort_by) params.set("sort_by", options.sort_by);
  if (options.sort_direction) params.set("sort_direction", options.sort_direction);

  // Numeric filters
  appendNumeric(params, "bravo_af_min", options.bravo_af_min);
  appendNumeric(params, "bravo_af_max", options.bravo_af_max);
  appendNumeric(params, "gnomad_genome_af_min", options.gnomad_genome_af_min);
  appendNumeric(params, "gnomad_genome_af_max", options.gnomad_genome_af_max);
  appendNumeric(params, "gnomad_exome_af_min", options.gnomad_exome_af_min);
  appendNumeric(params, "gnomad_exome_af_max", options.gnomad_exome_af_max);
  appendNumeric(params, "cadd_phred_min", options.cadd_phred_min);
  appendNumeric(params, "revel_max_genome_min", options.revel_max_genome_min);
  appendNumeric(params, "revel_max_exome_min", options.revel_max_exome_min);
  appendNumeric(params, "spliceai_max_genome_min", options.spliceai_max_genome_min);
  appendNumeric(params, "spliceai_max_exome_min", options.spliceai_max_exome_min);
  appendNumeric(params, "pangolin_max_genome_min", options.pangolin_max_genome_min);
  appendNumeric(params, "pangolin_max_exome_min", options.pangolin_max_exome_min);
  appendNumeric(params, "alphamissense_max_min", options.alphamissense_max_min);
  appendNumeric(params, "linsight_min", options.linsight_min);
  appendNumeric(params, "fathmm_xf_min", options.fathmm_xf_min);
  appendNumeric(params, "apc_conservation_min", options.apc_conservation_min);
  appendNumeric(params, "phylop_min", options.phylop_min);

  // Array filters
  appendArray(params, "variant_class", options.variant_class);
  appendArray(params, "gencode_region_type", options.gencode_region_type);
  appendArray(params, "gencode_consequence", options.gencode_consequence);
  appendArray(params, "refseq_region_type", options.refseq_region_type);
  appendArray(params, "refseq_consequence", options.refseq_consequence);
  appendArray(params, "ucsc_region_type", options.ucsc_region_type);
  appendArray(params, "ucsc_consequence", options.ucsc_consequence);
  appendArray(params, "clinvar_clnsig", options.clinvar_clnsig);
  appendArray(params, "clinvar_review_status", options.clinvar_review_status);
  appendArray(params, "clinvar_origin", options.clinvar_origin);
  appendArray(params, "sift_cat", options.sift_cat);
  appendArray(params, "polyphen_cat", options.polyphen_cat);
  appendArray(params, "alphamissense_class", options.alphamissense_class);
  appendArray(params, "dbnsfp_metasvm_pred", options.dbnsfp_metasvm_pred);
  appendArray(params, "aloft_description", options.aloft_description);
  appendArray(params, "funseq_description", options.funseq_description);
  appendArray(params, "cosmic_tier", options.cosmic_tier);
  appendArray(params, "cosmic_is_canonical", options.cosmic_is_canonical);
  appendArray(params, "cosmic_so_term", options.cosmic_so_term);

  return `${API_BASE}/variants?${params.toString()}`;
}

// ============================================================================
// Fetch Function
// ============================================================================

/**
 * Fetch paginated variants for a gene or region.
 * Uses GET /variants?gene=... or GET /variants?region=...
 */
export async function fetchVariantScan(
  geneOrRegion: string,
  options: VariantScanFilterOptions = {},
): Promise<VariantScanResult> {
  try {
    const url = buildVariantScanUrl(geneOrRegion, options);
    const response = await fetchOrNull<VariantScanApiResponse>(url);

    if (!response?.data) {
      return { data: [], pageInfo: null };
    }

    return {
      data: response.data,
      pageInfo: response.page_info,
    };
  } catch (error) {
    console.error("Variant scan fetch error:", error);
    return { data: [], pageInfo: null };
  }
}

// ============================================================================
// URL <-> Filter helpers (server-safe — no React)
// ============================================================================

/**
 * Multiselect URL params: each maps to a string[] field on the API client.
 * URL stores comma-separated values; API client expands them as repeated keys.
 */
export const ARRAY_FIELDS = [
  "variant_class",
  "gencode_region_type",
  "gencode_consequence",
  "refseq_region_type",
  "refseq_consequence",
  "ucsc_region_type",
  "ucsc_consequence",
  "clinvar_clnsig",
  "clinvar_review_status",
  "clinvar_origin",
  "sift_cat",
  "polyphen_cat",
  "alphamissense_class",
  "dbnsfp_metasvm_pred",
  "aloft_description",
  "funseq_description",
  "cosmic_tier",
  "cosmic_is_canonical",
  "cosmic_so_term",
] as const satisfies readonly (keyof VariantScanFilterOptions)[];

/** Numeric threshold filters. Each maps directly to an API field. */
export const NUMERIC_FIELDS = [
  "bravo_af_min",
  "bravo_af_max",
  "gnomad_genome_af_min",
  "gnomad_genome_af_max",
  "gnomad_exome_af_min",
  "gnomad_exome_af_max",
  "cadd_phred_min",
  "revel_max_genome_min",
  "revel_max_exome_min",
  "spliceai_max_genome_min",
  "spliceai_max_exome_min",
  "pangolin_max_genome_min",
  "pangolin_max_exome_min",
  "alphamissense_max_min",
  "linsight_min",
  "fathmm_xf_min",
  "apc_conservation_min",
  "phylop_min",
] as const satisfies readonly (keyof VariantScanFilterOptions)[];

/**
 * Server-side sortable columns. Matches the backend `sort_by` enum exactly.
 * Stale `sort_by` URL params not in this set are dropped to avoid 400s.
 */
export const SORTABLE_COLUMNS = new Set([
  "position",
  "vid",
  "chromosome",
  "gnomad_genome_af",
  "gnomad_exome_af",
  "gnomad_genome_ac",
  "gnomad_exome_ac",
  "gnomad_genome_an",
  "gnomad_exome_an",
  "gnomad_genome_nhomalt",
  "gnomad_exome_nhomalt",
  "bravo_af",
  "cadd_phred",
  "revel_max_genome",
  "revel_max_exome",
  "splice_ai_max_genome",
  "splice_ai_max_exome",
  "pangolin_max_genome",
  "pangolin_max_exome",
  "alpha_missense_max",
  "linsight",
  "fathmm_xf",
  "apc_conservation",
  "phylop",
]);

/**
 * Translate URL search params into VariantScanFilterOptions.
 * Used by both the client hook and the SSR page wrapper so both
 * code paths stay in lockstep — adding a filter once updates both.
 */
export function parseVariantScanFiltersFromUrl(
  searchParams: URLSearchParams,
): VariantScanFilterOptions {
  const filters: VariantScanFilterOptions = {};

  const pageSize = searchParams.get("page_size");
  filters.limit = pageSize ? Number(pageSize) : 20;

  const cursor = searchParams.get("cursor");
  if (cursor) filters.cursor = cursor;

  // Sort (URL keys are sort_by + sort_dir; API expects sort_by + sort_direction).
  // Drop unknown sort_by values so a stale URL can't 400 the backend.
  const sortBy = searchParams.get("sort_by");
  if (sortBy && SORTABLE_COLUMNS.has(sortBy)) filters.sort_by = sortBy;
  const sortDir = searchParams.get("sort_dir");
  if (sortDir === "asc" || sortDir === "desc") filters.sort_direction = sortDir;

  // Array filters (comma-separated in URL)
  for (const key of ARRAY_FIELDS) {
    const raw = searchParams.get(key);
    if (raw) {
      const arr = raw.split(",").filter(Boolean);
      if (arr.length) (filters[key] as string[]) = arr;
    }
  }

  // Numeric filters
  for (const key of NUMERIC_FIELDS) {
    const raw = searchParams.get(key);
    if (raw && !Number.isNaN(Number(raw))) {
      (filters[key] as number) = Number(raw);
    }
  }

  return filters;
}

/**
 * Adapter for Next.js searchParams shape (Record<string, string | string[] | undefined>).
 * Repeated keys arrive as arrays and are joined comma-separated to match the URL writer.
 */
export function nextSearchParamsToUrlSearchParams(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out.set(key, value.join(","));
    } else {
      out.set(key, value);
    }
  }
  return out;
}
