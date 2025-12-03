export type QueryType = "variant" | "rsid" | "gene" | "region";
export type SearchInputType = QueryType | "unknown";

export interface ParsedQuery {
  raw: string;
  trimmed: string;
  type: SearchInputType;
  normalized: string;
  formatted: string;
}

export interface QueryValidation {
  isValid: boolean;
  type: QueryType | null;
  error?: string;
  details?: {
    chromosome?: string;
    position?: number;
    startPosition?: number;
    endPosition?: number;
  };
}
