/**
 * Target intent → node type mapping and edge resolution.
 * The model says `into: ["diseases", "drugs"]` and we resolve to concrete edge types.
 */

import type { TargetIntent } from "./types";

// ---------------------------------------------------------------------------
// Unified intent configuration
// ---------------------------------------------------------------------------

interface IntentConfig {
  nodeType: string;
  /** When set, findEdgesConnecting restricts candidates to these edges for this intent */
  preferredEdges?: string[];
  /** Remap warning shown to agent */
  remapWarning?: string;
  /** Canonical intent this maps to (e.g. side_effects → adverse_effects) */
  canonicalIntent?: TargetIntent;
}

export const INTENT_CONFIG: Record<TargetIntent, IntentConfig> = {
  diseases:          { nodeType: "Disease" },
  drugs:             { nodeType: "Drug" },
  pathways:          { nodeType: "Pathway" },
  variants:          { nodeType: "Variant" },
  phenotypes:        { nodeType: "Phenotype" },
  tissues:           { nodeType: "Tissue" },
  genes:             { nodeType: "Gene" },
  proteins:          { nodeType: "Gene", remapWarning: "No Protein nodes — querying Gene targets instead." },
  compounds:         { nodeType: "Drug", remapWarning: "No Compound nodes — querying Drug targets instead." },
  protein_domains:   { nodeType: "ProteinDomain" },
  ccres:             { nodeType: "cCRE" },
  side_effects:      { nodeType: "SideEffect", canonicalIntent: "adverse_effects" },
  go_terms:          { nodeType: "GOTerm" },
  metabolites:       { nodeType: "Metabolite" },
  studies:           { nodeType: "Study" },
  signals:           { nodeType: "Signal" },
  drug_interactions: { nodeType: "Drug", preferredEdges: ["DRUG_INTERACTS_WITH_DRUG", "DRUG_PAIR_CAUSES_SIDE_EFFECT"] },
  adverse_effects:   { nodeType: "SideEffect", preferredEdges: ["DRUG_HAS_ADVERSE_EFFECT"] },
  drug_indications:  { nodeType: "Disease", preferredEdges: ["DRUG_INDICATED_FOR_DISEASE"] },
  drug_targets:      { nodeType: "Drug", preferredEdges: ["DRUG_ACTS_ON_GENE"] },
  drug_metabolism:   { nodeType: "Drug", preferredEdges: ["DRUG_DISPOSITION_BY_GENE"] },
  drug_response:     { nodeType: "Drug", preferredEdges: ["GENE_AFFECTS_DRUG_RESPONSE"] },
};

/**
 * Auto-remap deprecated / ambiguous intents to their canonical equivalents.
 * Returns [canonicalIntent, repairNote | null].
 */
export function canonicalizeIntent(intent: TargetIntent): [TargetIntent, string | null] {
  const config = INTENT_CONFIG[intent];
  if (config?.canonicalIntent) {
    return [config.canonicalIntent, `Remapped ${intent} → ${config.canonicalIntent} (canonical intent)`];
  }
  if (config?.remapWarning) {
    return [intent, config.remapWarning];
  }
  return [intent, null];
}

export interface EdgeTypeInfo {
  edgeType: string;
  fromType: string;
  toType: string;
  defaultScoreField?: string;
  propertyCount: number;
}

export interface SortStrategy {
  field: string;
  direction?: "asc" | "desc";
  label?: string;
}

export interface KeyFilter {
  field: string;
  op: string;
  value: unknown;
  priority: number;
  label?: string;
}

export interface GraphSchemaResponse {
  nodeTypes: Array<{
    nodeType: string;
    propertyCount?: number;
    summaryFields?: string[];
    searchAliases?: string[];
    agentBriefing?: string;
  }>;
  edgeTypes: Array<{
    edgeType: string;
    fromType: string;
    toType: string;
    label?: string;
    description?: string;
    defaultScoreField?: string;
    scoreFields?: string[];
    filterFields?: string[];
    propertyCount?: number;
    properties?: string[];
    sortStrategies?: SortStrategy[];
    keyFilters?: KeyFilter[];
    agentBriefing?: string;
  }>;
}

/**
 * Curated edge preference for (intent, fromType→toType) pairs.
 * When multiple edges connect two types, this determines which is
 * semantically best for the user's intent. Keyed by intent or by
 * "FromType→ToType" pair. First match wins.
 */
const EDGE_PREFERENCE: Record<string, string[]> = {
  // Type-pair preferences — every multi-edge pair must have a preference.
  // (Intent-specific edge preferences are in INTENT_CONFIG.preferredEdges.)
  "Gene→Disease": ["GENE_ASSOCIATED_WITH_DISEASE", "GENE_ALTERED_IN_DISEASE"],
  "Disease→Gene": ["GENE_ASSOCIATED_WITH_DISEASE", "GENE_ALTERED_IN_DISEASE"],
  "Variant→Gene": ["VARIANT_IMPLIES_GENE", "VARIANT_AFFECTS_GENE"],
  "Gene→Variant": ["VARIANT_IMPLIES_GENE", "VARIANT_AFFECTS_GENE"],
  "Gene→Drug": ["DRUG_ACTS_ON_GENE", "GENE_AFFECTS_DRUG_RESPONSE", "DRUG_DISPOSITION_BY_GENE"],
  "Drug→Gene": ["DRUG_ACTS_ON_GENE", "DRUG_DISPOSITION_BY_GENE", "GENE_AFFECTS_DRUG_RESPONSE"],
  "Gene→Gene": ["GENE_INTERACTS_WITH_GENE", "GENE_PARALOG_OF_GENE"],
  "Drug→SideEffect": ["DRUG_HAS_ADVERSE_EFFECT", "DRUG_PAIR_CAUSES_SIDE_EFFECT"],
  "SideEffect→Drug": ["DRUG_HAS_ADVERSE_EFFECT", "DRUG_PAIR_CAUSES_SIDE_EFFECT"],
  "Drug→Drug": ["DRUG_INTERACTS_WITH_DRUG", "DRUG_PAIR_CAUSES_SIDE_EFFECT"],
  "Drug→Disease": ["DRUG_INDICATED_FOR_DISEASE"],
  "Disease→Drug": ["DRUG_INDICATED_FOR_DISEASE"],
  "cCRE→Gene": ["CCRE_REGULATES_GENE"],
  "Gene→cCRE": ["CCRE_REGULATES_GENE"],
  "Variant→cCRE": ["VARIANT_OVERLAPS_CCRE"],
  "cCRE→Variant": ["VARIANT_OVERLAPS_CCRE"],
  // Variant→Drug (PGx): direct edge exists, prefer it for Variant seeds
  "Variant→Drug": ["VARIANT_ASSOCIATED_WITH_DRUG"],
  "Drug→Variant": ["VARIANT_ASSOCIATED_WITH_DRUG"],
  // Variant→Disease/Phenotype GWAS trait associations
  "Variant→Disease": ["VARIANT_ASSOCIATED_WITH_TRAIT__Disease"],
  "Disease→Variant": ["VARIANT_ASSOCIATED_WITH_TRAIT__Disease"],
  "Variant→Phenotype": ["VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype"],
  "Phenotype→Variant": ["VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype"],
  // Variant→SideEffect PGx link
  "Variant→SideEffect": ["VARIANT_LINKED_TO_SIDE_EFFECT"],
  "SideEffect→Variant": ["VARIANT_LINKED_TO_SIDE_EFFECT"],
  // Gene→Entity GWAS trait associations (biomarkers, measurements)
  "Gene→Entity": ["GENE_ASSOCIATED_WITH_ENTITY"],
  "Entity→Gene": ["GENE_ASSOCIATED_WITH_ENTITY"],
  // Variant→Entity GWAS trait associations
  "Variant→Entity": ["VARIANT_ASSOCIATED_WITH_TRAIT__Entity"],
  "Entity→Variant": ["VARIANT_ASSOCIATED_WITH_TRAIT__Entity"],
  // Pathway→Metabolite containment
  "Pathway→Metabolite": ["PATHWAY_CONTAINS_METABOLITE"],
  "Metabolite→Pathway": ["PATHWAY_CONTAINS_METABOLITE"],
};

/**
 * Find edge types connecting two node types (either direction).
 * Sorted by: (1) curated preference if available, (2) defaultScoreField, (3) property count.
 * Pass `intent` to use intent-specific edge preference overrides.
 */
export function findEdgesConnecting(
  schema: GraphSchemaResponse,
  fromType: string,
  toType: string,
  intent?: string,
): EdgeTypeInfo[] {
  const candidates = schema.edgeTypes
    .filter(
      (e) =>
        (e.fromType === fromType && e.toType === toType) ||
        (e.fromType === toType && e.toType === fromType),
    )
    .map((e) => ({
      edgeType: e.edgeType,
      fromType: e.fromType,
      toType: e.toType,
      defaultScoreField: e.defaultScoreField,
      propertyCount: e.propertyCount ?? 0,
    }));

  // Look up curated preference: intent-specific first, then type-pair
  const intentPref = intent ? INTENT_CONFIG[intent as TargetIntent]?.preferredEdges : undefined;
  const typePairPref =
    EDGE_PREFERENCE[`${fromType}→${toType}`] ||
    EDGE_PREFERENCE[`${toType}→${fromType}`];
  const preferredEdges = intentPref || typePairPref;

  // When an intent-specific preference exists, ONLY return candidates that
  // match one of the preferred edges. This forces backtracking to continue
  // to an ancestor type where the preferred edge actually exists.
  // Example: intent:drug_interactions wants DRUG_INTERACTS_WITH_DRUG (Drug→Drug),
  // so at SideEffect→Drug level the candidates (DRUG_HAS_ADVERSE_EFFECT) are
  // filtered out, and backtracking continues to Drug→Drug.
  if (intentPref) {
    const intentFiltered = candidates.filter((c) =>
      intentPref.includes(c.edgeType),
    );
    if (intentFiltered.length > 0) return intentFiltered;
    // No preferred edges found at this type pair — return empty to backtrack
    return [];
  }

  return candidates.sort((a, b) => {
    // 1) Curated preference order
    if (preferredEdges) {
      const aIdx = preferredEdges.indexOf(a.edgeType);
      const bIdx = preferredEdges.indexOf(b.edgeType);
      const aPref = aIdx >= 0 ? aIdx : 999;
      const bPref = bIdx >= 0 ? bIdx : 999;
      if (aPref !== bPref) return aPref - bPref;
    }
    // 2) Prefer edges with defaultScoreField
    if (a.defaultScoreField && !b.defaultScoreField) return -1;
    if (!a.defaultScoreField && b.defaultScoreField) return 1;
    // 3) Then by property count (richer = better)
    return b.propertyCount - a.propertyCount;
  });
}

/**
 * Get summary fields for a node type from the schema.
 */
export function getSummaryFields(
  schema: GraphSchemaResponse,
  nodeType: string,
): string[] {
  return (
    schema.nodeTypes.find((n) => n.nodeType === nodeType)?.summaryFields ?? []
  );
}

/**
 * Infer the best edge type connecting two node types.
 * Returns null if no edge connects them.
 */
export function inferEdgeType(
  schema: GraphSchemaResponse,
  fromType: string,
  toType: string,
): string | null {
  const edges = findEdgesConnecting(schema, fromType, toType);
  return edges[0]?.edgeType ?? null;
}

// ---------------------------------------------------------------------------
// Runtime intent map — merges static INTENT_CONFIG with schema searchAliases
// ---------------------------------------------------------------------------

const runtimeIntentMap = new Map<string, string>(
  Object.entries(INTENT_CONFIG).map(([k, v]) => [k, v.nodeType]),
);

/** Resolve an intent string to a node type using the runtime map (schema-enriched). */
export function resolveIntentType(intent: string): string | undefined {
  return runtimeIntentMap.get(intent) ?? INTENT_CONFIG[intent as TargetIntent]?.nodeType;
}

/**
 * Walk nodeTypes[].searchAliases and register them in the runtime intent map.
 * Static INTENT_CONFIG entries are never overwritten — schema aliases only fill gaps.
 */
export function mergeSchemaAliases(schema: GraphSchemaResponse): void {
  for (const nt of schema.nodeTypes) {
    if (!nt.searchAliases?.length) continue;
    for (const alias of nt.searchAliases) {
      const key = alias.toLowerCase().replace(/\s+/g, "_");
      if (!runtimeIntentMap.has(key)) {
        runtimeIntentMap.set(key, nt.nodeType);
      }
    }
  }
}
