/**
 * Format raw tissue/biosample names from various data sources into
 * human-readable labels.
 *
 * Handles: underscore_separated, dot.separated, lowercase cell types.
 */
export function formatTissueName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\((\d+)\s+(Years?|Days?)\)/gi, "($1 $2)");
}

/** Standard tissue groups returned by group_by=tissue_group (~18 groups) */
export const TISSUE_GROUPS = [
  "Brain", "Immune", "Cardiovascular", "Digestive", "Liver", "Lung",
  "Muscle", "Kidney", "Endocrine", "Reproductive", "Pancreas", "Nerve",
  "Skin", "Eye", "Connective", "Cell Line", "Stem Cell", "Other",
] as const;

/** Format large numbers: 1234 → "1.2K", 1234567 → "1.2M" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
