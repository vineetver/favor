/**
 * Target intent → node type mapping and edge resolution.
 * The model says `into: ["diseases", "drugs"]` and we resolve to concrete edge types.
 */

import type { TargetIntent } from "./types";

export const INTENT_TO_TYPE: Record<TargetIntent, string> = {
  diseases: "Disease",
  drugs: "Drug",
  pathways: "Pathway",
  variants: "Variant",
  phenotypes: "Phenotype",
  tissues: "Tissue",
  genes: "Gene",
  proteins: "Gene", // no Protein node — resolve to Gene (has protein/domain info)
  compounds: "Drug", // no Compound node — resolve to Drug
  protein_domains: "ProteinDomain",
  ccres: "cCRE",
  side_effects: "SideEffect", // deprecated — prefer adverse_effects
  go_terms: "GOTerm",
  metabolites: "Metabolite",
  studies: "Study",
  signals: "Signal",
  drug_interactions: "Drug", // DDI — resolves to Drug node type
  adverse_effects: "SideEffect", // canonical intent for drug side effects
  drug_indications: "Disease", // drugs indicated for which diseases
};

/**
 * Auto-remap deprecated / ambiguous intents to their canonical equivalents.
 * Returns [canonicalIntent, repairNote | null].
 */
export function canonicalizeIntent(intent: TargetIntent): [TargetIntent, string | null] {
  if (intent === "side_effects") {
    return ["adverse_effects", "Remapped side_effects → adverse_effects (canonical intent for drug side effects)"];
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

export interface GraphSchemaResponse {
  nodeTypes: Array<{
    nodeType: string;
    propertyCount?: number;
    summaryFields?: string[];
  }>;
  edgeTypes: Array<{
    edgeType: string;
    fromType: string;
    toType: string;
    label?: string;
    description?: string;
    defaultScoreField?: string;
    propertyCount?: number;
    properties?: string[];
  }>;
}

/**
 * Curated edge preference for (intent, fromType→toType) pairs.
 * When multiple edges connect two types, this determines which is
 * semantically best for the user's intent. Keyed by intent or by
 * "FromType→ToType" pair. First match wins.
 */
const EDGE_PREFERENCE: Record<string, string[]> = {
  // Intent-specific overrides (checked first)
  "intent:drug_interactions": ["DRUG_INTERACTS_WITH_DRUG", "DRUG_PAIR_CAUSES_SIDE_EFFECT"],
  "intent:drug_indications": ["DRUG_INDICATED_FOR_DISEASE"],
  "intent:adverse_effects": ["DRUG_HAS_ADVERSE_EFFECT"],

  // Type-pair preferences (checked when no intent override)
  "Gene→Drug": ["DRUG_ACTS_ON_GENE", "GENE_AFFECTS_DRUG_RESPONSE", "DRUG_DISPOSITION_BY_GENE"],
  "Drug→Gene": ["DRUG_ACTS_ON_GENE", "GENE_AFFECTS_DRUG_RESPONSE", "DRUG_DISPOSITION_BY_GENE"],
  "Drug→SideEffect": ["DRUG_HAS_ADVERSE_EFFECT"],
  "SideEffect→Drug": ["DRUG_HAS_ADVERSE_EFFECT"],
  "Drug→Drug": ["DRUG_INTERACTS_WITH_DRUG", "DRUG_PAIR_CAUSES_SIDE_EFFECT"],
  "Drug→Disease": ["DRUG_INDICATED_FOR_DISEASE"],
  "Disease→Drug": ["DRUG_INDICATED_FOR_DISEASE"],
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
  const prefKey = intent ? `intent:${intent}` : undefined;
  const intentPref = prefKey ? EDGE_PREFERENCE[prefKey] : undefined;
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
