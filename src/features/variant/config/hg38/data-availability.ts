import type { Variant } from "@features/variant/types";

type DataCheck = (v: Variant) => boolean;

const isMeaningful = (v: unknown): boolean => {
  if (v == null || v === "") return false;
  if (Array.isArray(v)) return v.some(isMeaningful);
  if (typeof v === "object")
    return Object.values(v as Record<string, unknown>).some(isMeaningful);
  return true;
};

// `hasAny` returns true only when at least one *leaf* value is non-empty.
// Empty arrays and empty nested objects no longer count as data — that
// was letting ClinVar tabs render for variants whose API response was
// `{clnsig: [], clndn: []}` (empty arrays inside non-null parent).
const hasAny = (obj: unknown): boolean => isMeaningful(obj);

/**
 * Maps navigation slugs → data availability predicate.
 * Slugs not listed here are always enabled (e.g. llm-summary, pharmacogenomics,
 * gwas-catalog, credible-sets, l2g-scores, genome-browser, regulatory) — those
 * tabs have their own data fetches and availability handling.
 *
 * Each predicate is the union of every Variant field the tab's column config
 * actually reads. A tab is hidden only when none of its data sources have any
 * value — never when even one piece of renderable data is present.
 */
export const variantDataChecks: Record<string, DataCheck> = {
  // Overview
  basic: (v) => !!v.vid,
  "functional-class": (v) =>
    !!v.genecode?.consequence ||
    !!v.refseq?.consequence ||
    (v.genecode?.transcripts?.length ?? 0) > 0 ||
    (v.refseq?.transcripts?.length ?? 0) > 0 ||
    (v.ucsc?.transcripts?.length ?? 0) > 0 ||
    hasAny(v.cage) ||
    !!v.genehancer?.id ||
    (v.genehancer?.targets?.length ?? 0) > 0 ||
    (v.super_enhancer?.ids?.length ?? 0) > 0,
  integrative: (v) =>
    hasAny(v.main?.cadd) ||
    hasAny(v.apc) ||
    v.linsight != null ||
    v.fathmm_xf != null,

  // Clinical & Disease
  clinvar: (v) => hasAny(v.clinvar),
  "somatic-mutation": (v) => hasAny(v.cosmic),

  // Pathogenicity & Scores
  "protein-function": (v) =>
    hasAny(v.main?.protein_predictions) ||
    hasAny(v.dbnsfp) ||
    v.apc?.protein_function_v3 != null ||
    v.apc?.protein_function_v2 != null ||
    v.apc?.protein_function != null ||
    (v.alphamissense?.predictions?.length ?? 0) > 0 ||
    v.alphamissense?.max_pathogenicity != null ||
    v.linsight != null ||
    v.fathmm_xf != null,
  "protein-structure": (v) =>
    (v.alphamissense?.predictions?.length ?? 0) > 0 ||
    v.alphamissense?.max_pathogenicity != null,
  conservation: (v) =>
    hasAny(v.main?.conservation) ||
    hasAny(v.main?.gerp) ||
    v.apc?.conservation_v2 != null ||
    v.apc?.conservation != null,
  "splice-ai": (v) =>
    v.gnomad_exome?.functional?.spliceai_ds_max != null ||
    v.gnomad_genome?.functional?.spliceai_ds_max != null ||
    v.gnomad_exome?.functional?.pangolin_largest_ds != null ||
    v.gnomad_genome?.functional?.pangolin_largest_ds != null,

  // Regulatory & Epigenetics
  epigenetics: (v) =>
    hasAny(v.epigenetic_phred) ||
    hasAny(v.main?.encode) ||
    v.apc?.epigenetics_active != null ||
    v.apc?.epigenetics_repressed != null ||
    v.apc?.epigenetics_transcription != null ||
    v.apc?.epigenetics != null ||
    hasAny(v.main?.sequence_context),
  "chromatin-state": (v) => hasAny(v.main?.chromhmm),
  "transcription-factors": (v) =>
    v.main?.remap?.overlap_tf != null ||
    v.main?.remap?.overlap_cl != null ||
    v.apc?.transcription_factor != null ||
    hasAny(v.cage),

  // Population Genetics
  "allele-frequency": (v) =>
    hasAny(v.gnomad_exome) ||
    hasAny(v.gnomad_genome) ||
    hasAny(v.bravo) ||
    hasAny(v.tg),
  "local-nucleotide-diversity": (v) =>
    v.apc?.local_nucleotide_diversity_v3 != null ||
    v.apc?.local_nucleotide_diversity_v2 != null ||
    v.apc?.local_nucleotide_diversity != null ||
    v.recombination_rate != null ||
    v.nucdiv != null ||
    v.main?.conservation?.bstatistic != null,
  "expected-rate-of-de-novo-mutation": (v) =>
    hasAny(v.mutation_rate) ||
    v.apc?.mutation_density != null ||
    hasAny(v.main?.variant_density),

  // Technical
  mappability: (v) => hasAny(v.mappability) || v.apc?.mappability != null,
};
