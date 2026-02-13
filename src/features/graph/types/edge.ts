// =============================================================================
// Edge Types
// =============================================================================

export type EdgeType =
  // Gene -> Disease edges
  | "ASSOCIATED_WITH_DISEASE"
  | "CURATED_FOR"
  | "CAUSES"
  | "CIVIC_EVIDENCED_FOR"
  | "PGX_ASSOCIATED"
  | "THERAPEUTIC_TARGET_IN"
  | "SCORED_FOR_DISEASE"
  | "BIOMARKER_FOR"
  | "INHERITED_CAUSE_OF"
  | "ASSERTED_FOR_DISEASE"
  // Gene -> Drug edges
  | "HAS_PGX_INTERACTION"
  | "HAS_CLINICAL_DRUG_EVIDENCE"
  | "ASSERTED_FOR_DRUG"
  // Gene -> Trait/Variant edges
  | "SCORED_FOR_TRAIT"
  | "HAS_GWAS_VARIANT"
  // Gene -> Pathway/GO edges
  | "PARTICIPATES_IN"
  // Gene -> Phenotype edges
  | "MANIFESTS_AS"
  | "MOUSE_MANIFESTS_AS"
  // Gene -> Gene edges
  | "INTERACTS_WITH"
  | "INTERACTS_IN_PATHWAY"
  | "REGULATES"
  | "FUNCTIONALLY_RELATED"
  // Gene -> GO/SideEffect edges
  | "ANNOTATED_WITH"
  | "ASSOCIATED_WITH_SIDE_EFFECT"
  // Drug edges
  | "TARGETS"
  | "TARGETS_IN_CONTEXT"
  | "INDICATED_FOR"
  | "HAS_SIDE_EFFECT"
  | "HAS_ADVERSE_REACTION"
  // Variant -> Trait/Disease edges
  | "GWAS_ASSOCIATED_WITH"
  | "AFFECTS_RESPONSE_TO"
  | "PGX_RESPONSE_FOR"
  | "STUDIED_FOR_DRUG_RESPONSE"
  | "FUNCTIONALLY_ASSAYED_FOR"
  | "PGX_CLINICAL_RESPONSE"
  | "PGX_DISEASE_ASSOCIATED"
  | "CLINVAR_ASSOCIATED"
  | "REPORTED_IN"
  // Variant -> Gene edges
  | "PREDICTED_TO_AFFECT"
  | "POSITIONALLY_LINKED_TO"
  | "ENHANCER_LINKED_TO"
  | "PREDICTED_REGULATORY_TARGET"
  | "MISSENSE_PATHOGENIC_FOR"
  | "SOMATICALLY_MUTATED_IN"
  | "CLINVAR_ANNOTATED_IN"
  // Variant -> other
  | "LINKED_TO_SIDE_EFFECT"
  | "OVERLAPS"
  // Disease/Phenotype edges
  | "PRESENTS_WITH"
  | "MAPS_TO"
  | "TRAIT_PRESENTS_WITH"
  // Study/regulatory edges
  | "INVESTIGATES"
  | "SE_MAPS_TO"
  | "EXPERIMENTALLY_REGULATES"
  | "COMPUTATIONALLY_REGULATES"
  // Metabolite edges
  | "CONTAINS_METABOLITE"
  | "METABOLITE_IS_A"
  // Ontology hierarchy edges
  | "SUBCLASS_OF"
  | "ANCESTOR_OF"
  | "PHENOTYPE_SUBCLASS_OF"
  | "PHENOTYPE_ANCESTOR_OF"
  | "PART_OF"
  | "PATHWAY_ANCESTOR_OF"
  | "EFO_SUBCLASS_OF"
  | "EFO_ANCESTOR_OF"
  | "GO_SUBCLASS_OF"
  | "GO_ANCESTOR_OF";

/**
 * Schema-driven field catalog per edge type.
 * Source of truth: docs/GRAPH_SCHEMA section 4.
 */
export const EDGE_TYPE_FIELDS: Partial<Record<EdgeType, string[]>> = {
  // Gene -> Disease
  ASSOCIATED_WITH_DISEASE: ["overall_score", "evidence_count", "num_datatypes", "genetic_association_score", "somatic_mutation_score", "known_drug_score", "source"],
  CURATED_FOR: ["classification", "mode_of_inheritance", "expert_panel", "report_url", "source"],
  CAUSES: ["allelic_requirement", "mutation_consequence", "confidence_category", "organ_specificity_list", "panel", "source"],
  CIVIC_EVIDENCED_FOR: ["evidence_type", "evidence_level", "clinical_significance", "rating", "citation_id", "nct_ids", "profile_evidence_score", "source"],
  PGX_ASSOCIATED: ["n_evidence", "pmids", "source"],
  THERAPEUTIC_TARGET_IN: ["best_clinical_status", "evidence_count", "evidence_pmids", "source"],
  SCORED_FOR_DISEASE: ["clinical_phase", "is_approved", "evidence_count", "mesh_heading", "source"],
  BIOMARKER_FOR: ["biomarker_id", "biomarker_name", "icd10", "icd11", "source"],
  INHERITED_CAUSE_OF: ["mechanism", "orphanet_gene_id", "orphanet_disease_id", "evidence_count", "evidence_pmids", "source"],
  ASSERTED_FOR_DISEASE: ["assertion_type", "assertion_direction", "significance", "amp_category", "assertion_id", "last_review_date", "source"],
  // Gene -> Drug
  HAS_PGX_INTERACTION: ["n_evidence", "is_pd", "pmids", "evidence_sources", "source"],
  HAS_CLINICAL_DRUG_EVIDENCE: ["clinical_significance", "evidence_level", "disease_context", "therapy_combination", "therapy_interaction_type", "rating", "citation_id", "source"],
  ASSERTED_FOR_DRUG: ["assertion_type", "assertion_direction", "significance", "amp_category", "assertion_id", "last_review_date", "source"],
  // Gene -> Trait
  SCORED_FOR_TRAIT: ["ld_score", "reg_score", "nassoc_score", "source_score", "total_score", "source"],
  // Drug -> Gene
  TARGETS: ["action_type", "mechanism_of_action", "num_sources", "sources", "max_clinical_phase"],
  TARGETS_IN_CONTEXT: ["disease_id", "disease_label", "mechanism_of_action", "max_phase", "num_trials", "trial_statuses", "trials"],
  // Drug -> Disease
  INDICATED_FOR: ["sources", "num_sources", "max_clinical_phase", "primary_source"],
  // Drug -> SideEffect
  HAS_SIDE_EFFECT: ["frequency", "frequency_description", "frequency_category", "source"],
  HAS_ADVERSE_REACTION: ["report_count", "llr", "critical_value", "node_match_type", "source"],
  // Variant -> Trait
  GWAS_ASSOCIATED_WITH: ["p_value_mlog", "or_beta", "risk_allele_freq", "risk_allele", "ci_95", "mapped_genes", "source"],
  // Variant -> Drug
  AFFECTS_RESPONSE_TO: ["significance", "direction_of_effect", "phenotype_category", "metabolizer_type", "pmid", "source"],
  PGX_RESPONSE_FOR: ["gene_symbol", "genotype", "pgx_category", "evidence_level", "is_direct_target", "consequence_so", "pmids", "source"],
  STUDIED_FOR_DRUG_RESPONSE: ["study_type", "study_cases", "study_controls", "p_value", "ratio_stat_type", "ratio_stat", "ci_start", "ci_stop", "population", "pmid", "source"],
  FUNCTIONALLY_ASSAYED_FOR: ["assay_type", "cell_type", "functional_terms", "direction_of_effect", "is_associated", "phenotype_category", "pmid", "source"],
  PGX_CLINICAL_RESPONSE: ["evidence_level", "score", "phenotype_category", "phenotype", "pmid_count", "evidence_count", "max_evidence_score", "source"],
  // Variant -> Disease
  PGX_DISEASE_ASSOCIATED: ["significance", "direction_of_effect", "phenotype_category", "best_p_value", "best_ratio_stat", "max_study_cases", "max_study_controls", "n_studies", "source"],
  CLINVAR_ASSOCIATED: ["clinical_significance", "review_status", "condition_name", "origin", "source"],
  // Variant -> Study
  REPORTED_IN: ["p_value_mlog", "or_beta", "risk_allele_freq", "ci_95", "risk_allele", "initial_sample_size", "replication_sample_size", "source"],
  // Variant -> Gene
  PREDICTED_TO_AFFECT: ["max_l2g_score", "confidence", "n_loci", "credible_set_confidence"],
  POSITIONALLY_LINKED_TO: ["region_type", "consequence", "hgvsc", "hgvsp", "source"],
  ENHANCER_LINKED_TO: ["enhancer_id", "feature_score", "target_score", "confidence", "source"],
  PREDICTED_REGULATORY_TARGET: ["score", "percentile", "confidence", "source"],
  MISSENSE_PATHOGENIC_FOR: ["protein_variant", "pathogenicity", "pathogenicity_class", "max_pathogenicity", "transcript_id", "confidence", "source"],
  SOMATICALLY_MUTATED_IN: ["sample_count", "tier", "so_term", "transcript", "aa_change", "hgvsc", "hgvsp", "domain_id", "domain_name", "confidence", "source"],
  CLINVAR_ANNOTATED_IN: ["clinical_significance", "review_status", "condition_name", "origin", "source"],
  // Variant -> SideEffect
  LINKED_TO_SIDE_EFFECT: ["gene_symbol", "drug_name", "significance", "direction", "phenotype_category", "pmid", "source"],
  // Gene -> Variant
  HAS_GWAS_VARIANT: ["p_value_mlog", "source"],
  // Study -> Trait
  INVESTIGATES: ["study_title", "trait_name", "source"],
  // Gene -> Pathway
  PARTICIPATES_IN: ["pathway_name", "pathway_source", "pathway_category"],
  // Gene -> Phenotype
  MANIFESTS_AS: ["evidence_code", "frequency", "disease_ids", "source"],
  MOUSE_MANIFESTS_AS: ["mouse_gene_symbol", "mouse_gene_id", "n_models", "phenotype_class_labels", "source"],
  // Disease -> Phenotype
  PRESENTS_WITH: ["match_types", "match_count"],
  // Trait -> Disease
  MAPS_TO: ["match_types", "match_count"],
  // Trait -> Phenotype
  TRAIT_PRESENTS_WITH: ["match_types", "match_count"],
  // Gene -> Gene
  INTERACTS_WITH: ["sources", "num_sources", "detection_methods", "pubmed_ids", "confidence_scores", "num_experiments", "ot_mi_score", "ot_evidence_count"],
  INTERACTS_IN_PATHWAY: ["pathway_name", "pathway_sources", "interaction_method"],
  REGULATES: ["interaction_type", "interaction_type_mi", "interaction_type_name", "pmid", "source"],
  FUNCTIONALLY_RELATED: ["combined_score", "confidence", "experiments", "database", "textmining", "coexpression", "neighborhood", "homology"],
  // Gene -> GOTerm
  ANNOTATED_WITH: ["go_namespace", "qualifier", "evidence_code", "aspect", "go_ref", "assigned_by", "annotation_date", "source"],
  // Gene -> SideEffect
  ASSOCIATED_WITH_SIDE_EFFECT: ["drug_name", "significance", "direction", "n_evidence", "source"],
  // cCRE -> Gene
  EXPERIMENTALLY_REGULATES: ["method", "max_score", "min_p_value", "n_tissues", "source"],
  COMPUTATIONALLY_REGULATES: ["method", "max_score", "min_p_value", "n_tissues", "source"],
  // Variant -> cCRE
  OVERLAPS: ["annotation", "annotation_label", "ccre_size", "distance_to_center", "relative_position"],
  // SideEffect -> OntologyTerm
  SE_MAPS_TO: ["dst_type", "match_type"],
  // Pathway -> Metabolite
  CONTAINS_METABOLITE: ["pathway_source", "pathway_name", "metabolite_name"],
  // Metabolite -> Metabolite
  METABOLITE_IS_A: ["src_name", "dst_name", "source"],
  // Hierarchy
  SUBCLASS_OF: ["src_name", "dst_name", "distance", "edge_type"],
  PHENOTYPE_SUBCLASS_OF: ["src_name", "dst_name", "distance"],
  PART_OF: ["src_name", "dst_name", "distance"],
  EFO_SUBCLASS_OF: ["src_name", "dst_name", "distance"],
  GO_SUBCLASS_OF: ["src_name", "dst_name", "distance"],
  // Closure
  ANCESTOR_OF: ["distance", "ancestor_name", "descendant_name"],
  PHENOTYPE_ANCESTOR_OF: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  PATHWAY_ANCESTOR_OF: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  EFO_ANCESTOR_OF: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  GO_ANCESTOR_OF: ["distance", "ancestor_name", "descendant_name"],
};

/**
 * Compute the union of all schema fields for a set of edge types.
 */
export function getEdgeFieldsForTypes(edgeTypes: EdgeType[]): string[] {
  const fields = new Set<string>();
  for (const et of edgeTypes) {
    const f = EDGE_TYPE_FIELDS[et];
    if (f) for (const field of f) fields.add(field);
  }
  return Array.from(fields);
}

export const EDGE_TYPE_CONFIG: Record<EdgeType, { label: string; color: string; description: string }> = {
  // Gene -> Disease (Red/Orange family)
  ASSOCIATED_WITH_DISEASE: { label: "Associated With Disease", color: "#ef4444", description: "Gene associated with disease" },
  CURATED_FOR: { label: "Curated For", color: "#dc2626", description: "Gene curated for disease association" },
  CAUSES: { label: "Causes", color: "#b91c1c", description: "Gene causes disease" },
  CIVIC_EVIDENCED_FOR: { label: "CIViC Evidenced For", color: "#f97316", description: "CIViC clinical evidence for disease" },
  PGX_ASSOCIATED: { label: "PGx Associated", color: "#ea580c", description: "Pharmacogenomic association" },
  THERAPEUTIC_TARGET_IN: { label: "Therapeutic Target In", color: "#fb923c", description: "Gene is therapeutic target in disease" },
  SCORED_FOR_DISEASE: { label: "Scored For Disease", color: "#f87171", description: "Gene scored for disease relevance" },
  BIOMARKER_FOR: { label: "Biomarker For", color: "#e11d48", description: "Gene is biomarker for disease" },
  INHERITED_CAUSE_OF: { label: "Inherited Cause Of", color: "#be123c", description: "Gene inherited cause of disease" },
  ASSERTED_FOR_DISEASE: { label: "Asserted For Disease", color: "#fca5a5", description: "Gene asserted for disease" },

  // Gene -> Drug (Cyan family)
  HAS_PGX_INTERACTION: { label: "Has PGx Interaction", color: "#06b6d4", description: "Gene has pharmacogenomic interaction with drug" },
  HAS_CLINICAL_DRUG_EVIDENCE: { label: "Has Clinical Drug Evidence", color: "#0891b2", description: "Gene has clinical drug evidence" },
  ASSERTED_FOR_DRUG: { label: "Asserted For Drug", color: "#22d3ee", description: "Gene asserted for drug" },

  // Gene -> Trait/Variant (Amber family)
  SCORED_FOR_TRAIT: { label: "Scored For Trait", color: "#f59e0b", description: "Gene scored for trait" },
  HAS_GWAS_VARIANT: { label: "Has GWAS Variant", color: "#d97706", description: "Gene has GWAS variant" },

  // Gene -> Pathway/GO (Purple family)
  PARTICIPATES_IN: { label: "Participates In", color: "#8b5cf6", description: "Gene participates in pathway" },

  // Gene -> Phenotype (Pink family)
  MANIFESTS_AS: { label: "Manifests As", color: "#ec4899", description: "Gene manifests as phenotype" },
  MOUSE_MANIFESTS_AS: { label: "Mouse Manifests As", color: "#f472b6", description: "Mouse model manifests as phenotype" },

  // Gene -> Gene (Blue family)
  INTERACTS_WITH: { label: "Interacts With", color: "#3b82f6", description: "Gene interacts with gene" },
  INTERACTS_IN_PATHWAY: { label: "Interacts In Pathway", color: "#2563eb", description: "Genes interact in pathway context" },
  REGULATES: { label: "Regulates", color: "#1d4ed8", description: "Gene regulates gene" },
  FUNCTIONALLY_RELATED: { label: "Functionally Related", color: "#60a5fa", description: "Functionally related genes" },

  // Gene -> GO/SideEffect
  ANNOTATED_WITH: { label: "Annotated With", color: "#a78bfa", description: "Gene annotated with GO term" },
  ASSOCIATED_WITH_SIDE_EFFECT: { label: "Associated With Side Effect", color: "#c084fc", description: "Gene associated with side effect" },

  // Drug edges (Green family)
  TARGETS: { label: "Targets", color: "#22c55e", description: "Drug targets gene" },
  TARGETS_IN_CONTEXT: { label: "Targets In Context", color: "#16a34a", description: "Drug targets gene in context" },
  INDICATED_FOR: { label: "Indicated For", color: "#15803d", description: "Drug indicated for disease" },
  HAS_SIDE_EFFECT: { label: "Has Side Effect", color: "#4ade80", description: "Drug has side effect" },
  HAS_ADVERSE_REACTION: { label: "Has Adverse Reaction", color: "#86efac", description: "Drug has adverse reaction" },

  // Variant -> Trait/Disease (Amber/Yellow family)
  GWAS_ASSOCIATED_WITH: { label: "GWAS Associated With", color: "#eab308", description: "Variant GWAS associated with trait" },
  AFFECTS_RESPONSE_TO: { label: "Affects Response To", color: "#ca8a04", description: "Variant affects response to drug" },
  PGX_RESPONSE_FOR: { label: "PGx Response For", color: "#a16207", description: "Variant PGx response for drug" },
  STUDIED_FOR_DRUG_RESPONSE: { label: "Studied For Drug Response", color: "#fbbf24", description: "Variant studied for drug response" },
  FUNCTIONALLY_ASSAYED_FOR: { label: "Functionally Assayed For", color: "#fcd34d", description: "Variant functionally assayed" },
  PGX_CLINICAL_RESPONSE: { label: "PGx Clinical Response", color: "#b45309", description: "Variant PGx clinical response" },
  PGX_DISEASE_ASSOCIATED: { label: "PGx Disease Associated", color: "#92400e", description: "Variant PGx disease associated" },
  CLINVAR_ASSOCIATED: { label: "ClinVar Associated", color: "#d97706", description: "Variant ClinVar associated" },
  REPORTED_IN: { label: "Reported In", color: "#f59e0b", description: "Variant reported in study" },

  // Variant -> Gene (Amber-orange family)
  PREDICTED_TO_AFFECT: { label: "Predicted To Affect", color: "#fb923c", description: "Variant predicted to affect gene" },
  POSITIONALLY_LINKED_TO: { label: "Positionally Linked To", color: "#fdba74", description: "Variant positionally linked to gene" },
  ENHANCER_LINKED_TO: { label: "Enhancer Linked To", color: "#fed7aa", description: "Variant enhancer linked to gene" },
  PREDICTED_REGULATORY_TARGET: { label: "Predicted Regulatory Target", color: "#f97316", description: "Variant predicted regulatory target" },
  MISSENSE_PATHOGENIC_FOR: { label: "Missense Pathogenic For", color: "#ea580c", description: "Missense variant pathogenic for gene" },
  SOMATICALLY_MUTATED_IN: { label: "Somatically Mutated In", color: "#c2410c", description: "Variant somatically mutated in disease" },
  CLINVAR_ANNOTATED_IN: { label: "ClinVar Annotated In", color: "#9a3412", description: "Variant ClinVar annotated in gene" },

  // Variant -> other
  LINKED_TO_SIDE_EFFECT: { label: "Linked To Side Effect", color: "#fde047", description: "Variant linked to side effect" },
  OVERLAPS: { label: "Overlaps", color: "#facc15", description: "Variant overlaps cCRE" },

  // Disease/Phenotype edges (Rose family)
  PRESENTS_WITH: { label: "Presents With", color: "#f43f5e", description: "Disease presents with phenotype" },
  MAPS_TO: { label: "Maps To", color: "#d946ef", description: "Trait maps to disease" },
  TRAIT_PRESENTS_WITH: { label: "Trait Presents With", color: "#e879f9", description: "Trait presents with phenotype" },

  // Study/regulatory edges (Teal family)
  INVESTIGATES: { label: "Investigates", color: "#14b8a6", description: "Study investigates" },
  SE_MAPS_TO: { label: "SE Maps To", color: "#0d9488", description: "Side effect maps to" },
  EXPERIMENTALLY_REGULATES: { label: "Experimentally Regulates", color: "#0f766e", description: "Experimentally validated regulation" },
  COMPUTATIONALLY_REGULATES: { label: "Computationally Regulates", color: "#115e59", description: "Computationally predicted regulation" },

  // Metabolite edges (Pink family)
  CONTAINS_METABOLITE: { label: "Contains Metabolite", color: "#db2777", description: "Pathway contains metabolite" },
  METABOLITE_IS_A: { label: "Metabolite Is A", color: "#be185d", description: "Metabolite is a subclass" },

  // Ontology hierarchy edges (Neutral/Gray family)
  SUBCLASS_OF: { label: "Subclass Of", color: "#6b7280", description: "Disease subclass of" },
  ANCESTOR_OF: { label: "Ancestor Of", color: "#9ca3af", description: "Disease ancestor of" },
  PHENOTYPE_SUBCLASS_OF: { label: "Phenotype Subclass Of", color: "#6b7280", description: "Phenotype subclass of" },
  PHENOTYPE_ANCESTOR_OF: { label: "Phenotype Ancestor Of", color: "#9ca3af", description: "Phenotype ancestor of" },
  PART_OF: { label: "Part Of", color: "#6366f1", description: "Pathway part of parent" },
  PATHWAY_ANCESTOR_OF: { label: "Pathway Ancestor Of", color: "#818cf8", description: "Pathway ancestor of" },
  EFO_SUBCLASS_OF: { label: "EFO Subclass Of", color: "#6b7280", description: "EFO subclass of" },
  EFO_ANCESTOR_OF: { label: "EFO Ancestor Of", color: "#9ca3af", description: "EFO ancestor of" },
  GO_SUBCLASS_OF: { label: "GO Subclass Of", color: "#6b7280", description: "GO subclass of" },
  GO_ANCESTOR_OF: { label: "GO Ancestor Of", color: "#9ca3af", description: "GO ancestor of" },
};
