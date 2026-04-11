/**
 * Tissue/biosample formatting utilities.
 *
 * Generic formatters (formatCount, formatPvalue) live in
 * @shared/utils/value-formatters and are re-exported here so existing
 * imports from "tissue-format" keep working.
 */

export { formatCount, formatPvalue } from "./value-formatters";

// ── Tissue-specific helpers ──────────────────────────────────────

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
  "Brain",
  "Immune",
  "Cardiovascular",
  "Digestive",
  "Liver",
  "Lung",
  "Muscle",
  "Kidney",
  "Endocrine",
  "Reproductive",
  "Pancreas",
  "Nerve",
  "Skin",
  "Eye",
  "Connective",
  "Cell Line",
  "Stem Cell",
  "Other",
] as const;

/**
 * Map a fine-grained tissue name to one of the 18 standard tissue groups.
 * Uses prefix matching for GTEx-style names ("Brain Amygdala" -> "Brain")
 * and exact matching for known names.
 */
const TISSUE_GROUP_PREFIXES: [string, string][] = [
  ["Brain", "Brain"],
  ["Nerve", "Nerve"],
  ["Heart", "Cardiovascular"],
  ["Artery", "Cardiovascular"],
  ["Coronary", "Cardiovascular"],
  ["Liver", "Liver"],
  ["Lung", "Lung"],
  ["Kidney", "Kidney"],
  ["Pancreas", "Pancreas"],
  ["Stomach", "Digestive"],
  ["Colon", "Digestive"],
  ["Esophagus", "Digestive"],
  ["Small Intestine", "Digestive"],
  ["Muscle", "Muscle"],
  ["Skeletal", "Muscle"],
  ["Skin", "Skin"],
  ["Adipose", "Connective"],
  ["Fibroblast", "Connective"],
  ["Breast", "Reproductive"],
  ["Ovary", "Reproductive"],
  ["Uterus", "Reproductive"],
  ["Prostate", "Reproductive"],
  ["Testis", "Reproductive"],
  ["Vagina", "Reproductive"],
  ["Thyroid", "Endocrine"],
  ["Adrenal", "Endocrine"],
  ["Pituitary", "Endocrine"],
  ["Spleen", "Immune"],
  ["Whole Blood", "Immune"],
  ["EBV", "Immune"],
  ["Cells", "Cell Line"],
];

export function inferTissueGroup(tissueName: string): string {
  for (const [prefix, group] of TISSUE_GROUP_PREFIXES) {
    if (tissueName.startsWith(prefix)) return group;
  }
  return "Other";
}

/** Format enhancer/link scores: exponential below 0.01, 2 decimals above */
export function fmtScore(v: number): string {
  return v < 0.01 ? v.toExponential(0) : v.toFixed(2);
}

/** Format genomic distance: bp / kb / Mb */
export function formatDist(d: number | null): string {
  if (d == null) return "\u2014";
  const abs = Math.abs(d);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)} Mb`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)} kb`;
  return `${abs} bp`;
}
