export interface SuggestionResult {
  id: string;
  value: string;
  label: string;
  type: string;
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
