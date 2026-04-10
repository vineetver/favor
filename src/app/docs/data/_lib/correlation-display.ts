/* ------------------------------------------------------------------ */
/*  Category display metadata + annotation label prettifier             */
/*  Pure data — no React, no runtime imports.                           */
/* ------------------------------------------------------------------ */

export interface CategoryDisplay {
  label: string;
  color: string;
}

/**
 * Functional annotation categories keyed by the raw `name` in annotation_order.json.
 * Frequency categories (AlleleFrequency, FilteringAF, GnomadFunctional) are excluded
 * from the heatmap — they aren't functional annotations.
 *
 * Colors are chosen to be distinct, legible on both light and dark backgrounds.
 */
export const CATEGORY_DISPLAY: Record<string, CategoryDisplay> = {
  Conservation:      { label: "Conservation",             color: "#2563eb" }, // blue
  aPC:               { label: "Annotation PCs",           color: "#f59e0b" }, // amber
  Pathogenicity:     { label: "Integrative Scores",       color: "#dc2626" }, // red
  Protein:           { label: "Protein Function",         color: "#e11d48" }, // rose
  Splicing:          { label: "Splicing",                 color: "#db2777" }, // pink
  NoncodingReg:      { label: "Non-coding Regulatory",    color: "#7c3aed" }, // violet
  Sequence:          { label: "Sequence Context",         color: "#9333ea" }, // purple
  Distance:          { label: "Proximity to TSS/TES",     color: "#0891b2" }, // cyan
  ChromHMM:          { label: "ChromHMM (25-state)",      color: "#059669" }, // emerald
  Encode:            { label: "Epigenetics",              color: "#16a34a" }, // green
  VariantDensity:    { label: "Mutation Density",         color: "#d97706" }, // amber-dark
  ReMap:             { label: "Transcription Factors",    color: "#ea580c" }, // orange
  Regulatory:        { label: "Regulatory",               color: "#65a30d" }, // lime
  MutationRate:      { label: "Mutation Rate",            color: "#0d9488" }, // teal
  Mappability:       { label: "Mappability",              color: "#4f46e5" }, // indigo
  PopGen:            { label: "Local Diversity",          color: "#0284c7" }, // sky
};

/* ------------------------------------------------------------------ */
/*  Prefix-stripping rules (order matters — first match wins)           */
/* ------------------------------------------------------------------ */

type Replacer = (match: RegExpMatchArray) => string;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PREFIX_RULES: [RegExp, Replacer][] = [
  // ENCODE histone marks
  [/^encode_(.+?)_phred$/, (m) => m[1].replace(/_/g, "").replace("total", "Total ").replace("dnase", "DNase")],
  // dbNSFP predictors
  [/^dbnsfp_(.+?)(?:_score)?$/, (m) => m[1].split("_").map(capitalize).join(" ")],
  // gnomAD exome/genome AFs
  [/^gnomad_(exome|genome)_(?:populations\.)?(\w+?)_af(?:_(xx|xy))?$/, (m) => {
    const src = m[1] === "exome" ? "ex" : "ge";
    const sex = m[3] ? ` ${m[3].toUpperCase()}` : "";
    return `gnomAD ${src} ${m[2].toUpperCase()}${sex}`;
  }],
  [/^gnomad_(exome|genome)_af(?:_(xx|xy))?$/, (m) => {
    const src = m[1] === "exome" ? "ex" : "ge";
    const sex = m[2] ? ` ${m[2].toUpperCase()}` : "";
    return `gnomAD ${src} AF${sex}`;
  }],
  // gnomAD filtering AFs
  [/^gnomad_(exome|genome)_faf_(.+)$/, (m) => `gnomAD ${m[1] === "exome" ? "ex" : "ge"} ${m[2].toUpperCase()}`],
  // gnomAD functional scores
  [/^gnomad_(exome|genome)_functional_(.+)$/, (m) => `gnomAD ${m[1] === "exome" ? "ex" : "ge"} ${m[2].split("_").map(capitalize).join(" ")}`],
  // Conservation
  [/^conservation_(.+)$/, (m) => m[1].charAt(0).toUpperCase() + m[1].slice(1)],
  // GERP
  [/^gerp_(.+)$/, (m) => `GERP ${m[1].toUpperCase()}`],
  // aPC
  [/^apc_(.+?)(?:_v\d+)?$/, (m) => `aPC-${m[1].split("_").map(capitalize).join("-")}`],
  // Named scores (exact matches)
  [/^cadd_phred$/, () => "CADD PHRED"],
  [/^fathmm_xf$/, () => "FATHMM-XF"],
  [/^gpn_msa_phred$/, () => "GPN-MSA"],
  [/^jarvis_phred$/, () => "JARVIS"],
  [/^remm_phred$/, () => "REMM"],
  [/^ncer_percentile$/, () => "NCER"],
  [/^ncboost_percentile$/, () => "NCBoost"],
  [/^linsight$/, () => "LINSIGHT"],
  [/^funseq_score$/, () => "FunSeq"],
  [/^gnomad_cst_phred$/, () => "gnomAD Constraint"],
  [/^aloft_score$/, () => "ALoFT"],
  [/^alphamissense_max_pathogenicity$/, () => "AlphaMissense"],
  // Protein predictions
  [/^protein_predictions_(.+?)(?:_val)?$/, (m) => m[1].split("_").map(capitalize).join(" ")],
  // SpliceAI
  [/^spliceai_(.+)$/, (m) => `SpliceAI ${m[1].replace("ds_", "").replace("max_ds", "max").toUpperCase()}`],
  // CV2F / MACIE
  [/^(cv2f|macie)_(.+?)_phred$/, (m) => `${m[1].toUpperCase()} ${m[2]}`],
  // Sequence context
  [/^sequence_context_(.+?)_phred$/, (m) => m[1].toUpperCase()],
  // Distance
  [/^distance_min_dist_(.+)$/, (m) => `minDist${m[1].toUpperCase()}`],
  // ChromHMM
  [/^chromhmm_(.+)$/, (m) => `ChromHMM ${m[1].toUpperCase()}`],
  // Variant density
  [/^variant_density_(.+)$/, (m) => {
    const parts = m[1].split("_");
    return `${capitalize(parts[0])} ${parts[1]}`;
  }],
  // ReMap
  [/^remap_overlap_(.+)$/, (m) => `ReMap ${m[1].toUpperCase()}`],
  // GeneHancer
  [/^genehancer_feature_score$/, () => "GeneHancer"],
  // Mutation rate
  [/^mutation_rate_(.+)$/, (m) => `MutRate ${m[1].toUpperCase()}`],
  // Mappability
  [/^mappability_k(\d+)_(.+)$/, (m) => `${m[2]} k${m[1]}`],
  // BRAVO
  [/^bravo_bravo_af$/, () => "BRAVO AF"],
  // 1000 Genomes
  [/^tg_tg_(.+)$/, (m) => `1KG ${m[1].toUpperCase()}`],
  // PopGen
  [/^nucdiv$/, () => "NucDiv"],
  [/^recombination_rate$/, () => "Recombination Rate"],
];

/**
 * Turn a raw annotation label like `encode_h3k27ac_phred` into
 * a concise display string like `H3K27ac`. Falls back to replacing
 * underscores with spaces and title-casing.
 */
export function prettifyAnnotation(label: string): string {
  for (const [re, replacer] of PREFIX_RULES) {
    const m = label.match(re);
    if (m) return replacer(m);
  }
  return label
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
