import type { SchemaPropertyMeta } from "../api";

// =============================================================================
// Edge Field Filtering — schema-driven (meta.hidden) + empty-value removal
// =============================================================================

/** Check if a value is empty (null, undefined, empty string, empty array). */
function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0)
  );
}

/**
 * Filter edge fields:
 * - With propertyMeta: drop fields where meta.hidden === true, drop empty values
 * - Without propertyMeta: drop empty values only
 */
export function filterEdgeFields(
  fields: Record<string, unknown>,
  propertyMeta: SchemaPropertyMeta[] | undefined,
): Record<string, unknown> {
  const hiddenKeys = new Set<string>();
  if (propertyMeta) {
    for (const prop of propertyMeta) {
      if (prop.hidden) hiddenKeys.add(prop.name);
    }
  }

  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (hiddenKeys.has(k)) continue;
    if (isEmpty(v)) continue;
    filtered[k] = v;
  }
  return filtered;
}

/**
 * Build a label map from property metadata.
 * Returns field name → human-readable label (from YAML metadata).
 */
export function buildFieldLabelMap(
  propertyMeta: SchemaPropertyMeta[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!propertyMeta) return map;
  for (const prop of propertyMeta) {
    if (prop.label) {
      map.set(prop.name, prop.label);
    }
  }
  return map;
}
