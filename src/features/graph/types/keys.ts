import type { EntityType } from "./entity";
import type { EdgeType } from "./edge";

// =============================================================================
// Branded Key Types
// =============================================================================

/**
 * Canonical node key: "EntityType:id"
 * e.g. "Gene:ENSG00000130203"
 */
export type NodeKey = string & { readonly __brand: "NodeKey" };

/**
 * Canonical edge key: "EdgeType:fromKey->toKey"
 * e.g. "GENE_ASSOCIATED_WITH_DISEASE:Gene:ENSG00000130203->Disease:MONDO_0005070"
 */
export type EdgeKey = string & { readonly __brand: "EdgeKey" };

// =============================================================================
// Constructors
// =============================================================================

export function makeNodeKey(type: EntityType, id: string): NodeKey {
  return `${type}:${id}` as NodeKey;
}

export function makeEdgeKey(
  edgeType: EdgeType,
  sourceKey: NodeKey,
  targetKey: NodeKey,
): EdgeKey {
  return `${edgeType}:${sourceKey}->${targetKey}` as EdgeKey;
}

// =============================================================================
// Parsers
// =============================================================================

export function parseNodeKey(key: NodeKey): { type: EntityType; id: string } {
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return { type: "" as EntityType, id: key };
  return {
    type: key.substring(0, colonIdx) as EntityType,
    id: key.substring(colonIdx + 1),
  };
}

export function parseEdgeKey(
  key: EdgeKey,
): { edgeType: EdgeType; sourceKey: NodeKey; targetKey: NodeKey } | null {
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return null;
  const edgeType = key.substring(0, colonIdx) as EdgeType;
  const rest = key.substring(colonIdx + 1);
  const arrowIdx = rest.indexOf("->");
  if (arrowIdx === -1) return null;
  return {
    edgeType,
    sourceKey: rest.substring(0, arrowIdx) as NodeKey,
    targetKey: rest.substring(arrowIdx + 2) as NodeKey,
  };
}

/**
 * Extract raw ID from a NodeKey (drops the type prefix)
 */
export function rawIdFromNodeKey(key: NodeKey): string {
  const colonIdx = key.indexOf(":");
  if (colonIdx === -1) return key;
  return key.substring(colonIdx + 1);
}
