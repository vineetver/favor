/**
 * Per-mode data interfaces for RunResultEnvelope.data.
 *
 * Each graph handler's okResult data conforms to one of these interfaces,
 * discriminated by the `_mode` field. Consumers (compactify, entity extractors)
 * cast to these types for safe field access.
 */

import type { EntityRef } from "./types";

// ---------------------------------------------------------------------------
// Explore modes
// ---------------------------------------------------------------------------

export interface NeighborsResultData {
  _mode: "neighbors";
  _method?: string;
  results: Record<string, {
    count: number;
    top: Array<EntityRef & { rank?: number; score?: number; edgeProperties?: Record<string, unknown>; subtitle?: string }>;
    edgeType: string;
    scoreField?: string;
    description?: string;
    availableRelationships?: Array<{ edgeType: string; label: string; used: boolean }>;
  }>;
  resolved_seeds: EntityRef[];
  enrichment?: unknown;
  _proteinDomains?: unknown;
}

export interface CompareResultData {
  _mode: "compare";
  _method?: string;
  entities: EntityRef[];
  relationship?: string;
  edgeDescription?: string;
  // Same-type compare
  comparisons?: Record<string, {
    label?: string;
    shared: Array<{ entity: EntityRef; score?: number }>;
    unique: Record<string, Array<{ entity: EntityRef }>>;
    counts: { shared: number; unique: Record<string, number> };
  }>;
  overallSimilarity?: { sharedNeighborCount: number; jaccardIndex: number };
  // Mixed-type compare
  sharedNeighbors?: Array<{
    neighbor: EntityRef;
    support: Array<{ from: EntityRef; edge: { type: string } }>;
  }>;
  counts?: { shared?: number; limit?: number };
}

export interface EnrichResultData {
  _mode: "enrich";
  _method: string;
  relationship: string;
  edgeDescription?: string;
  edgeStrategy: string;
  inputType: string;
  inputSize: number;
  backgroundSize: number;
  enriched: Array<{
    entity: EntityRef;
    overlap: number;
    pValue: number;
    adjustedPValue: number;
    foldEnrichment: number;
    overlappingEntities: string[];
  }>;
}

export interface SimilarResultData {
  _mode: "similar";
  _method: string;
  seed: EntityRef;
  method: string;
  similar: Array<{
    entity: EntityRef;
    score: number;
    sharedNeighbors: number;
    explanations?: string[];
  }>;
}

export interface ContextResultData {
  _mode: "context";
  entities: Array<{
    entity: EntityRef;
    summary?: {
      description?: string;
      keyFacts?: string[];
      totalConnections?: number;
      connectedTypes?: string[];
    };
    neighbors?: Record<string, {
      count: number;
      top: Array<{ entity: EntityRef; score?: number; edgeType?: string; direction?: string }>;
    }>;
    evidence?: {
      sourceCount?: number;
      topSources?: string[];
      edgeTypeCount?: number;
      topEdgeTypes?: string[];
    };
    ontology?: { parentCount?: number; childCount?: number };
  }>;
}

export interface AggregateResultData {
  _mode: "aggregate";
  seed?: EntityRef;
  relationship?: string;
  edgeType?: string;
  metric?: string;
  value?: number;
  buckets?: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Traverse modes
// ---------------------------------------------------------------------------

export interface ChainResultData {
  _mode: "chain";
  seed: EntityRef;
  steps: Array<{
    intent: string;
    edgeType: string;
    edgeDescription?: string;
    scoreField?: string;
    count: number;
    top: Array<EntityRef & { score?: number; edgeProperties?: Record<string, unknown>; supportCount?: number; subtitle?: string }>;
  }>;
}

export interface PathsResultData {
  _mode: "paths";
  _method: string;
  from: string;
  to: string;
  edgeAnnotations: Record<string, { description: string }>;
  paths: Array<{
    rank: number;
    length: number;
    pathText: string;
    nodes: Array<{ type: string; id: string; label: string }>;
  }>;
}

export interface PatternsResultData {
  _mode: "patterns";
  pattern: Array<{ var: string; type?: string; edge?: string; from?: string; to?: string }>;
  matches: Array<{
    vars: Record<string, string>;
    edges?: unknown[][];
    score?: number;
  }>;
  totalMatches: number;
  nodeColumns?: string[];
  nodes?: Record<string, unknown[]>;
  edgeColumns?: string[];
  fieldMeta?: unknown;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type GraphResultData =
  | NeighborsResultData
  | CompareResultData
  | EnrichResultData
  | SimilarResultData
  | ContextResultData
  | AggregateResultData
  | ChainResultData
  | PathsResultData
  | PatternsResultData;
