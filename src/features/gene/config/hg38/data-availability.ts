import type { Gene } from "@features/gene/types";

type DataCheck = (gene: Gene, edgeCounts?: Record<string, number>) => boolean;

const hasAny = (obj: unknown): boolean =>
  obj != null &&
  (typeof obj !== "object" ||
    Object.values(obj as Record<string, unknown>).some(
      (v) => v != null && v !== "",
    ));

const hasEdges = (
  edgeCounts: Record<string, number> | undefined,
  ...types: string[]
): boolean => {
  if (!edgeCounts) return true; // if counts weren't fetched, don't disable
  return types.some((t) => (edgeCounts[t] ?? 0) > 0);
};

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
  pathways: (g) => hasAny(g.pathways),
  "human-phenotype": (g) => hasAny(g.disease_phenotype),
  "animal-phenotype": (g) => hasAny(g.model_organisms),
  "constraints-and-heplo": (g) => hasAny(g.constraint_scores),

  // Disease & Therapeutics — entity fields
  "disease-portfolio": (g, ec) =>
    hasAny(g.disease_phenotype) ||
    !!g.opentargets?.approved_name ||
    hasEdges(ec, "GENE_ASSOCIATED_WITH_DISEASE"),
  "tractability-and-target-class": (g) =>
    (g.opentargets?.tractability?.length ?? 0) > 0 ||
    (g.opentargets?.target_class?.length ?? 0) > 0,
  "chemical-probes": (g) => (g.opentargets?.chemical_probes?.length ?? 0) > 0,
  tep: (g) => !!g.opentargets?.tep,
  "safety-liabilities": (g) =>
    (g.opentargets?.safety_liabilities?.length ?? 0) > 0,
  "cancer-hallmarks": (g) => hasAny(g.opentargets?.hallmarks),

  // Disease & Therapeutics — graph edges
  "phenotype-signature": (_g, ec) =>
    hasEdges(ec, "GENE_ASSOCIATED_WITH_PHENOTYPE"),
  "drug-landscape": (_g, ec) =>
    hasEdges(ec, "DRUG_ACTS_ON_GENE", "DRUG_DISPOSITION_BY_GENE"),
  pharmacogenomics: (_g, ec) => hasEdges(ec, "GENE_AFFECTS_DRUG_RESPONSE"),
  "somatic-alterations": (_g, ec) => hasEdges(ec, "GENE_ALTERED_IN_DISEASE"),
};
