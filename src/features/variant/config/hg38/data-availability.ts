import type { Variant } from "@features/variant/types";

type DataCheck = (v: Variant) => boolean;

const hasAny = (obj: unknown): boolean =>
  obj != null &&
  (typeof obj !== "object" ||
    Object.values(obj as Record<string, unknown>).some(
      (v) => v != null && v !== "",
    ));

/**
 * Maps navigation slugs → data availability predicate.
 * Slugs not listed here are always enabled (e.g. llm-summary, genome-browser).
 */
export const variantDataChecks: Record<string, DataCheck> = {
  // Overview
  basic: (v) => !!v.vid,
  "functional-class": (v) =>
    !!v.genecode?.consequence || !!v.refseq?.consequence,
  integrative: (v) => !!v.main?.cadd || hasAny(v.apc),

  // Clinical & Disease
  clinvar: (v) => hasAny(v.clinvar),
  pharmacogenomics: (v) => false, // OpenTargets-only — always fetched client-side; disable when no clinvar signal
  "somatic-mutation": (v) => hasAny(v.cosmic),

  // Pathogenicity & Scores
  "variant-effects": (v) =>
    !!v.main?.cadd?.phred || !!v.alphamissense?.max_pathogenicity,
  "protein-function": (v) =>
    hasAny(v.main?.protein_predictions) || hasAny(v.dbnsfp),
  "protein-structure": (v) =>
    (v.alphamissense?.predictions?.length ?? 0) > 0,
  conservation: (v) => hasAny(v.main?.conservation),
  "splice-ai": (v) => !!v.gnomad_exome?.functional?.spliceai_ds_max || !!v.gnomad_genome?.functional?.spliceai_ds_max,
  consequences: (v) =>
    (v.genecode?.transcripts?.length ?? 0) > 0 ||
    (v.refseq?.exonic_details?.length ?? 0) > 0,

  // Regulatory & Epigenetics
  epigenetics: (v) => hasAny(v.epigenetic_phred) || hasAny(v.main?.encode),
  "chromatin-state": (v) => hasAny(v.main?.chromhmm),
  "transcription-factors": (v) =>
    !!v.main?.remap?.overlap_tf || hasAny(v.cage),

  // Population Genetics
  "allele-frequency": (v) =>
    hasAny(v.gnomad_exome) || hasAny(v.gnomad_genome),
  "local-nucleotide-diversity": (v) =>
    hasAny(v.apc) && !!v.apc?.local_nucleotide_diversity,
  "expected-rate-of-de-novo-mutation": (v) => hasAny(v.mutation_rate),

  // Technical
  mappability: (v) => hasAny(v.mappability),

  // Cell/Tissue
  ccres: (v) => hasAny(v.ccre),
  pgboost: (v) => (v.pgboost?.length ?? 0) > 0,
};
