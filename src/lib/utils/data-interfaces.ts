// Standard interfaces for pagination, filtering, and sorting across all AI tools

export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
}

export interface PaginationResponse {
  hasNextPage: boolean;
  nextCursor?: string;
  totalCount?: number;
}

export interface FilterParams {
  // Numeric filters with thresholds
  thresholds?: Record<string, number>;
  
  // Categorical filters
  categories?: string[];
  tissues?: string[];
  cellTypes?: string[];
  experimentalMethods?: string[];
  
  // Common genomic filters
  confidenceMin?: number;
  pValueMax?: number;
  scoreMin?: number;
  scoreMax?: number;
  
  // Regulatory element filters
  regulatoryMarks?: string[];
  regulatoryTypes?: string[];
  
  // Interaction filters
  interactionTypes?: string[];
  evidenceTypes?: string[];
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StandardToolParams extends PaginationParams, FilterParams, SortParams {}

export interface StandardToolResponse<T = any> extends PaginationResponse {
  data: T[];
  metadata?: {
    appliedFilters?: FilterParams;
    appliedSort?: SortParams;
    dataType: string;
    source?: string;
    totalFiltered?: number;
  };
}

// Specific filter interfaces for different data types
export interface GWASFilters extends FilterParams {
  traits?: string[];
  studyTypes?: string[];
  populations?: string[];
  minSampleSize?: number;
}

export interface PPIFilters extends FilterParams {
  databases?: ('biogrid' | 'intact' | 'huri')[];
  minConfidence?: number;
  maxDistance?: number;
}

export interface RegulatoryFilters extends FilterParams {
  enhancerTypes?: string[];
  activityPatterns?: string[];
  validationStatus?: string[];
  developmentalStages?: string[];
}

export interface ABCFilters extends FilterParams {
  minABCScore?: number;
  maxDistance?: number;
  targetGenes?: string[];
}

// Common field definitions for genomic data
export interface GenomicField {
  name: string;
  type: 'numeric' | 'categorical' | 'text' | 'boolean';
  description: string;
  aliases?: string[];
  unit?: string;
  range?: [number, number];
  categories?: string[];
}