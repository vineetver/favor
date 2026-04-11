// Typeahead API Types
export type EntityType =
  | "genes"
  | "diseases"
  | "drugs"
  | "pathways"
  | "variants"
  | "phenotypes"
  | "studies"
  | "entities"
  | "go_terms"
  | "side_effects"
  | "ccre"
  | "metabolites"
  | "signals"
  | "protein_domains"
  | "tissues"
  | "cell_types";

export type MatchTier = "NameExact" | "Prefix" | "FuzzyOrContains" | "Related";

export type MatchReason = "name_exact" | "prefix" | "fuzzy" | "pivot";

/** Link counts keyed by entity type or relationship name (dynamic from backend) */
export type EntityLinks = Record<string, number>;

export interface TypeaheadSuggestion {
  id: string;
  display_name: string;
  entity_type: EntityType;
  description?: string;
  match_tier: MatchTier;
  match_reason: MatchReason;
  url?: string | null;
  links?: EntityLinks;
}

export interface TypeaheadGroup {
  entity_type: EntityType;
  suggestions: TypeaheadSuggestion[];
}

export interface TypeaheadResponse {
  groups: TypeaheadGroup[];
  exact_present: boolean;
  total_count: number;
}

// Search/Pivot API Types
export interface SearchEntity extends TypeaheadSuggestion {
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchResults {
  query?: string;
  anchor_id?: string;
  anchor_type?: EntityType;
  took_ms: number;
  results: Partial<Record<EntityType, SearchEntity[]>>;
  total: number;
  cursor?: string;
  debug?: {
    expand_took_ms?: number;
    anchor_match?: {
      id: string;
      display_name: string;
      entity_type: EntityType;
    };
  };
}

// Variant Prefix API Types (RocksDB-backed, covers all 8.9B variants)
export interface VariantPrefixResult {
  vcf: string;
  rsid?: string;
  gene?: string;
  caddPhred?: number;
  gnomadAf?: number;
}

export interface VariantPrefixRsidMatch {
  rsid: string;
  variant_vcfs: string[];
}

export interface VariantPrefixResponse {
  pattern: "vcf" | "rsid_prefix" | "partial_vcf";
  results: VariantPrefixResult[];
  rsid_matches?: VariantPrefixRsidMatch[];
  has_more: boolean;
}

// API Request Parameters
export interface TypeaheadParams {
  q: string;
  types?: string;
  limit?: number;
  include_links?: boolean;
  signal?: AbortSignal;
}

export interface SearchParams {
  q?: string;
  types?: string;
  limit?: number;
  expand?: boolean;
  cursor?: string;
  include?: string;
  debug?: boolean;
  anchor_id?: string;
  anchor_type?: EntityType;
  include_links?: boolean;
  signal?: AbortSignal;
}
