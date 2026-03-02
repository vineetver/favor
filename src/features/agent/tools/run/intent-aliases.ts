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
  side_effects: "SideEffect",
  go_terms: "GOTerm",
  metabolites: "Metabolite",
  studies: "Study",
  signals: "Signal",
};

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
 * Find edge types connecting two node types (either direction).
 * Sorted by preference: edges with defaultScoreField first, then by property count.
 */
export function findEdgesConnecting(
  schema: GraphSchemaResponse,
  fromType: string,
  toType: string,
): EdgeTypeInfo[] {
  return schema.edgeTypes
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
    }))
    .sort((a, b) => {
      // Prefer edges with defaultScoreField
      if (a.defaultScoreField && !b.defaultScoreField) return -1;
      if (!a.defaultScoreField && b.defaultScoreField) return 1;
      // Then by property count (richer = better)
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
