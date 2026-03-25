import { fetchOrNull } from "@infra/api";

import { API_BASE } from "@/config/api";

// ============================================================================
// Types
// ============================================================================

export interface GeneIdentifiers {
  entrezId?: number;
  hgncId?: string;
  uniprotId?: string;
  refseqId?: string;
  ucscId?: string;
  omimId?: number;
  ensemblGeneId?: string;
  geneSymbol?: string;
  [key: string]: unknown;
}

/**
 * Variant count fields returned by the statistics API (camelCase).
 *
 * Keys follow the pattern: category + Subcategory + optional Snv/Indel suffix.
 *   varTotal, varSnv, varIndel
 *   freqCommon, freqCommonSnv, freqCommonIndel, ...
 *   locExonic, locExonicSnv, locExonicIndel, ...
 *   funcMissense, funcMissenseSnv, funcMissenseIndel, ...
 *   clinPathogenic, clinPathogenicSnv, clinPathogenicIndel, ...
 *   predSiftDeleterious, predSiftDeleteriousSnv, ...
 *   predCaddPhred10, predCaddPhred20, ...
 *   predAlphamissensePathogenic, predAlphamissenseBenign, predAlphamissenseAmbiguous, ...
 *   regEnhancer, regPromoter, ...
 *   apcConservation, apcProteinFunction, apcEpigeneticsActive, ...
 *   scoreActionable, scoreClinicalInterest
 */
export interface VariantCounts {
  varTotal: number;
  varSnv: number;
  varIndel: number;
  [key: string]: number;
}

export interface GeneVariantStatistics {
  ensemblGeneId: string;
  geneSymbol: string;
  chromosome: string;
  startPosition: number;
  endPosition: number;
  identifiers: GeneIdentifiers;
  counts: VariantCounts;
  // Allow snake_case variants the API might also return
  ensembl_gene_id?: string;
  gene_symbol?: string;
  start_position?: number;
  end_position?: number;
}

// ============================================================================
// Fetch Function
// ============================================================================

/**
 * Fetch pre-aggregated variant statistics for a gene.
 * Uses GET /statistics/gene/{gene}
 */
export async function fetchGeneVariantStatistics(
  gene: string,
): Promise<GeneVariantStatistics | null> {
  const url = `${API_BASE}/statistics/gene/${encodeURIComponent(gene)}`;
  return fetchOrNull<GeneVariantStatistics>(url);
}
