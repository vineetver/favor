// Typeahead API Types
export type EntityType = 'genes' | 'diseases' | 'drugs' | 'pathways' | 'variants';

export type MatchType = 'prefix' | 'substring' | 'fuzzy';

export interface EntityLinks {
  gene_count?: number;
  disease_count?: number;
  drug_count?: number;
  variant_count?: number;
  pathway_count?: number;
}

export interface EntityPreview {
  genes?: string[];
  diseases?: string[];
  drugs?: string[];
  pathways?: string[];
  variants?: string[];
}

export interface TypeaheadSuggestion {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  match_type: MatchType;
  highlight: string;
  url?: string | null;
  links?: EntityLinks;
  preview?: EntityPreview;
}

export interface TypeaheadResponse {
  query: string;
  took_ms: number;
  suggestions: {
    genes?: TypeaheadSuggestion[];
    diseases?: TypeaheadSuggestion[];
    drugs?: TypeaheadSuggestion[];
    pathways?: TypeaheadSuggestion[];
    variants?: TypeaheadSuggestion[];
  };
  total: number;
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
  };
  total: number;
  cursor?: string;
  debug?: {
    expand_took_ms?: number;
    anchor_match?: {
      id: string;
      name: string;
      type: EntityType;
    };
  };
}

// API Request Parameters
export interface TypeaheadParams {
  q: string;
  types?: string;
  limit?: number;
  include_links?: boolean;
  include_preview?: boolean;
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
}
