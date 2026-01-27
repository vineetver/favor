// Typeahead API Types
export type EntityType =
  | "genes"
  | "diseases"
  | "drugs"
  | "pathways"
  | "variants"
  | "phenotypes"
  | "studies"
  | "traits";

export type MatchTier =
  | "IdExact"
  | "NameExact"
  | "SynonymExact"
  | "Prefix"
  | "Contains"
  | "Fuzzy"
  | "Pivot";

export type MatchReason =
  | "id_exact"
  | "name_exact"
  | "synonym_exact"
  | "prefix"
  | "contains"
  | "fuzzy"
  | "pivot";

export interface EntityLinks {
  genes?: number;
  diseases?: number;
  drugs?: number;
  variants?: number;
  pathways?: number;
  traits?: number;
  phenotypes?: number;
  studies?: number;
  interactors?: number;
  parents?: number;
  children?: number;
  targets?: number;
}

export interface EntityLinked {
  genes?: string[];
  diseases?: string[];
  drugs?: string[];
  pathways?: string[];
  variants?: string[];
  phenotypes?: string[];
  studies?: string[];
  traits?: string[];
}

export interface TypeaheadSuggestion {
  id: string;
  display_name: string;
  entity_type: EntityType;
  description?: string;
  match_tier: MatchTier;
  match_reason: MatchReason;
  url?: string | null;
  links?: EntityLinks;
  linked?: EntityLinked;
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
  results: {
    genes?: SearchEntity[];
    diseases?: SearchEntity[];
    drugs?: SearchEntity[];
    pathways?: SearchEntity[];
    variants?: SearchEntity[];
    phenotypes?: SearchEntity[];
    studies?: SearchEntity[];
    traits?: SearchEntity[];
  };
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

// API Request Parameters
export interface TypeaheadParams {
  q: string;
  types?: string;
  limit?: number;
  include_links?: boolean;
  include_linked?: boolean;
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
  include_linked?: boolean;
  signal?: AbortSignal;
}
