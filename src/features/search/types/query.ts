/**
 * Query validation and routing types
 */

export type QueryType =
  | "variant_vcf"
  | "variant_rsid"
  | "gene"
  | "disease"
  | "drug"
  | "pathway"
  | "unknown";

export interface ParsedQuery {
  type: QueryType;
  raw: string;
  normalized: string;
  isValid: boolean;
  confidence: "high" | "medium" | "low";
}

export interface VariantVCF {
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  normalized: string; // chr-pos-ref-alt format
}

export interface ParsedVariantQuery extends ParsedQuery {
  type: "variant_vcf" | "variant_rsid";
  vcf?: VariantVCF;
  rsid?: string;
}

export interface RouteDestination {
  path: string;
  shouldPreload: boolean;
  preloadFn?: () => Promise<unknown>;
}
