export interface AutocompleteHit {
  value: string;
  data?: {
    snp_type?: string;
    variant_vcf?: string;
    clnsig?: string;
    genecode_category?: string;
    genecode_exonic_type?: string;
    chromosome?: string;
    position?: string;
    [key: string]: unknown;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  source: AutocompleteHit;
}
