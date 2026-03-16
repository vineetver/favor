import type { Gene } from "@features/gene/types";

type DataCheck = (gene: Gene) => boolean;

const hasAny = (obj: unknown): boolean =>
  obj != null &&
  (typeof obj !== "object" ||
    Object.values(obj as Record<string, unknown>).some(
      (v) => v != null && v !== "",
    ));

/**
 * Maps navigation slugs → data availability predicate.
 * Slugs not listed here are always enabled (e.g. llm-summary, graph-explorer, genome-browser).
 */
export const geneDataChecks: Record<string, DataCheck> = {
  // Gene Annotation
  "info-and-ids": (g) => !!g.gene_symbol,
  function: (g) =>
    !!g.function_description || hasAny(g.go) || hasAny(g.pathways),
  expression: (g) => hasAny(g.gtex) || hasAny(g.rna_expression),
  "protein-structure": (g) => !!g.uniprot_id,
  "protein-protein-interactions": (g) =>
    !!g.interactions_int_act ||
    !!g.interactions_bio_grid ||
    !!g.interactions_consensus_path_db,
  pathways: (g) => hasAny(g.pathways),
  "human-phenotype": (g) => hasAny(g.disease_phenotype),
  "animal-phenotype": (g) => hasAny(g.model_organisms),
  "constraints-and-heplo": (g) => hasAny(g.constraint_scores),

  // Disease & Therapeutics
  "disease-portfolio": (g) =>
    hasAny(g.disease_phenotype) || !!g.opentargets?.approved_name,
  "phenotype-signature": (g) => hasAny(g.disease_phenotype),
  "tractability-and-target-class": (g) =>
    (g.opentargets?.tractability?.length ?? 0) > 0 ||
    (g.opentargets?.target_class?.length ?? 0) > 0,
  "chemical-probes": (g) =>
    (g.opentargets?.chemical_probes?.length ?? 0) > 0,
  tep: (g) => !!g.opentargets?.tep,
  "safety-liabilities": (g) =>
    (g.opentargets?.safety_liabilities?.length ?? 0) > 0,
  "cancer-hallmarks": (g) => hasAny(g.opentargets?.hallmarks),
};
