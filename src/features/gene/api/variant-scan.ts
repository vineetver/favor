import { fetchOrNull } from "@infra/api";
import type { Variant } from "@features/variant/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
  // Frequency filters
  bravo_af_min?: number;
  bravo_af_max?: number;
  gnomad_genome_af_min?: number;
  gnomad_genome_af_max?: number;
  gnomad_exome_af_min?: number;
  gnomad_exome_af_max?: number;
  // Consequence filters
  gencode_consequence?: string[];
  gencode_region_type?: string[];
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
  if (values?.length) {
    for (const val of values) {
      params.append(key, val);
    }
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
  appendArray(params, "gencode_consequence", options.gencode_consequence);
  appendArray(params, "gencode_region_type", options.gencode_region_type);
  appendArray(params, "clinvar_clnsig", options.clinvar_clnsig);
  appendArray(params, "clinvar_review_status", options.clinvar_review_status);
  appendArray(params, "clinvar_origin", options.clinvar_origin);
  appendArray(params, "sift_cat", options.sift_cat);
  appendArray(params, "polyphen_cat", options.polyphen_cat);
  appendArray(params, "alphamissense_class", options.alphamissense_class);
  appendArray(params, "dbnsfp_metasvm_pred", options.dbnsfp_metasvm_pred);
  appendArray(params, "cosmic_tier", options.cosmic_tier);
  appendArray(params, "cosmic_is_canonical", options.cosmic_is_canonical);

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
