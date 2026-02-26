// =============================================================================
// Edge Types
// =============================================================================

export type EdgeType =
  // Gene → Disease
  | "GENE_ASSOCIATED_WITH_DISEASE"
  | "GENE_ALTERED_IN_DISEASE"
  // Gene → Drug
  | "GENE_AFFECTS_DRUG_RESPONSE"
  // Gene → Entity (was Trait)
  | "GENE_ASSOCIATED_WITH_ENTITY"
  // Gene → Pathway
  | "GENE_PARTICIPATES_IN_PATHWAY"
  // Gene → GOTerm
  | "GENE_ANNOTATED_WITH_GO_TERM"
  // Gene → Phenotype
  | "GENE_ASSOCIATED_WITH_PHENOTYPE"
  // Gene → Gene
  | "GENE_INTERACTS_WITH_GENE"
  | "GENE_PARALOG_OF_GENE"
  // Gene → SideEffect
  | "GENE_ASSOCIATED_WITH_SIDE_EFFECT"
  // Gene → ProteinDomain
  | "GENE_HAS_PROTEIN_DOMAIN"
  // Gene → Tissue
  | "GENE_EXPRESSED_IN_TISSUE"
  // Drug → Gene
  | "DRUG_ACTS_ON_GENE"
  | "DRUG_DISPOSITION_BY_GENE"
  // Drug → Disease
  | "DRUG_INDICATED_FOR_DISEASE"
  // Drug → SideEffect
  | "DRUG_HAS_ADVERSE_EFFECT"
  | "DRUG_PAIR_CAUSES_SIDE_EFFECT"
  // Drug → Drug
  | "DRUG_INTERACTS_WITH_DRUG"
  // Variant → Gene
  | "VARIANT_IMPLIES_GENE"
  | "VARIANT_AFFECTS_GENE"
  // Variant → Entity/Disease/Phenotype (trait associations)
  | "VARIANT_ASSOCIATED_WITH_TRAIT__Entity"
  | "VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype"
  | "VARIANT_ASSOCIATED_WITH_TRAIT__Disease"
  // Variant → Drug
  | "VARIANT_ASSOCIATED_WITH_DRUG"
  // Variant → Study
  | "VARIANT_ASSOCIATED_WITH_STUDY"
  // Variant → SideEffect
  | "VARIANT_LINKED_TO_SIDE_EFFECT"
  // Variant → cCRE
  | "VARIANT_OVERLAPS_CCRE"
  // cCRE → Gene
  | "CCRE_REGULATES_GENE"
  // Disease → Phenotype
  | "DISEASE_HAS_PHENOTYPE"
  // Phenotype → Phenotype
  | "PHENOTYPE_EQUIVALENT_TO"
  | "PHENOTYPE_HIERARCHY"
  | "PHENOTYPE_CLOSURE"
  // Study → Entity/Disease/Phenotype
  | "STUDY_INVESTIGATES_TRAIT__Entity"
  | "STUDY_INVESTIGATES_TRAIT__Disease"
  | "STUDY_INVESTIGATES_TRAIT__Phenotype"
  // Disease → Disease
  | "DISEASE_SUBCLASS_OF_DISEASE"
  | "DISEASE_ANCESTOR_OF_DISEASE"
  // Pathway → Pathway
  | "PATHWAY_PART_OF_PATHWAY"
  | "PATHWAY_ANCESTOR_OF_PATHWAY"
  // Entity → Entity (was EFO)
  | "ENTITY_HIERARCHY"
  | "ENTITY_CLOSURE"
  // GO → GO
  | "GO_HIERARCHY"
  | "GO_CLOSURE"
  // Metabolite
  | "PATHWAY_CONTAINS_METABOLITE"
  | "METABOLITE_IS_A_METABOLITE"
  // Signal (all new)
  | "SIGNAL_ASSOCIATED_WITH_TRAIT__Disease"
  | "SIGNAL_ASSOCIATED_WITH_TRAIT__Entity"
  | "SIGNAL_ASSOCIATED_WITH_TRAIT__Phenotype"
  | "SIGNAL_HAS_VARIANT"
  | "SIGNAL_IMPLIES_GENE"
  // ProteinDomain → ProteinDomain
  | "DOMAIN_SUBCLASS_OF_DOMAIN"
  | "DOMAIN_ANCESTOR_OF_DOMAIN";

/**
 * Schema-driven field catalog per edge type.
 * Source of truth: docs/GRAPH_SCHEMA section 4.
 */
export const EDGE_TYPE_FIELDS: Partial<Record<EdgeType, string[]>> = {
  // Gene → Disease
  GENE_ASSOCIATED_WITH_DISEASE: ["overall_score", "evidence_count", "num_datatypes", "genetic_association_score", "somatic_mutation_score", "known_drug_score", "relation_subtype", "source"],
  GENE_ALTERED_IN_DISEASE: ["alteration_type", "sample_count", "frequency", "relation_subtype", "source"],
  // Gene → Drug
  GENE_AFFECTS_DRUG_RESPONSE: ["n_evidence", "clinical_significance", "evidence_level", "disease_context", "relation_subtype", "source"],
  // Gene → Entity
  GENE_ASSOCIATED_WITH_ENTITY: ["total_score", "ld_score", "nassoc_score", "n_variants", "n_studies", "best_p_value_mlog", "relation_subtype", "source"],
  // Gene → Pathway
  GENE_PARTICIPATES_IN_PATHWAY: ["pathway_name", "pathway_source", "pathway_category", "source"],
  // Gene → GOTerm
  GENE_ANNOTATED_WITH_GO_TERM: ["go_namespace", "qualifier", "evidence_code", "aspect", "assigned_by", "source"],
  // Gene → Phenotype
  GENE_ASSOCIATED_WITH_PHENOTYPE: ["evidence_code", "frequency", "disease_ids", "relation_subtype", "source"],
  // Gene → Gene
  GENE_INTERACTS_WITH_GENE: ["combined_score", "confidence", "num_sources", "detection_methods", "relation_subtype", "source"],
  GENE_PARALOG_OF_GENE: ["identity_pct", "alignment_length", "source"],
  // Gene → SideEffect
  GENE_ASSOCIATED_WITH_SIDE_EFFECT: ["drug_name", "significance", "direction", "n_evidence", "source"],
  // Gene → ProteinDomain
  GENE_HAS_PROTEIN_DOMAIN: ["domain_name", "start_position", "end_position", "score", "source"],
  // Gene → Tissue
  GENE_EXPRESSED_IN_TISSUE: ["expression_level", "tpm", "tissue_name", "source"],
  // Drug → Gene
  DRUG_ACTS_ON_GENE: ["action_type", "mechanism_of_action", "num_sources", "max_clinical_phase", "relation_subtype", "source"],
  DRUG_DISPOSITION_BY_GENE: ["disposition_type", "mechanism", "source"],
  // Drug → Disease
  DRUG_INDICATED_FOR_DISEASE: ["sources", "num_sources", "max_clinical_phase", "primary_source", "source"],
  // Drug → SideEffect
  DRUG_HAS_ADVERSE_EFFECT: ["frequency", "frequency_description", "report_count", "llr", "relation_subtype", "source"],
  DRUG_PAIR_CAUSES_SIDE_EFFECT: ["drug_pair", "report_count", "confidence", "source"],
  // Drug → Drug
  DRUG_INTERACTS_WITH_DRUG: ["interaction_type", "severity", "description", "source"],
  // Variant → Gene
  VARIANT_IMPLIES_GENE: ["max_l2g_score", "confidence", "n_loci", "enhancer_id", "feature_score", "relation_subtype", "source"],
  VARIANT_AFFECTS_GENE: ["clinical_significance", "review_status", "pathogenicity", "max_pathogenicity", "sample_count", "relation_subtype", "source"],
  // Variant → Entity/Disease/Phenotype
  VARIANT_ASSOCIATED_WITH_TRAIT__Entity: ["p_value_mlog", "or_beta", "risk_allele_freq", "risk_allele", "ci_95", "source"],
  VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype: ["p_value_mlog", "or_beta", "risk_allele_freq", "risk_allele", "ci_95", "source"],
  VARIANT_ASSOCIATED_WITH_TRAIT__Disease: ["clinical_significance", "review_status", "significance", "direction_of_effect", "relation_subtype", "source"],
  // Variant → Drug
  VARIANT_ASSOCIATED_WITH_DRUG: ["significance", "direction_of_effect", "phenotype_category", "evidence_level", "score", "relation_subtype", "source"],
  // Variant → Study
  VARIANT_ASSOCIATED_WITH_STUDY: ["p_value_mlog", "or_beta", "risk_allele_freq", "ci_95", "risk_allele", "initial_sample_size", "source"],
  // Variant → SideEffect
  VARIANT_LINKED_TO_SIDE_EFFECT: ["gene_symbol", "drug_name", "significance", "direction", "phenotype_category", "pmid", "source"],
  // Variant → cCRE
  VARIANT_OVERLAPS_CCRE: ["annotation", "annotation_label", "ccre_size", "distance_to_center", "relative_position"],
  // cCRE → Gene
  CCRE_REGULATES_GENE: ["method", "max_score", "min_p_value", "n_tissues", "relation_subtype", "source"],
  // Disease → Phenotype
  DISEASE_HAS_PHENOTYPE: ["match_types", "match_count", "source"],
  // Phenotype → Phenotype
  PHENOTYPE_EQUIVALENT_TO: ["match_types", "match_count", "source"],
  PHENOTYPE_HIERARCHY: ["src_name", "dst_name", "distance", "source"],
  PHENOTYPE_CLOSURE: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  // Study → trait
  STUDY_INVESTIGATES_TRAIT__Entity: ["study_title", "trait_name", "source"],
  STUDY_INVESTIGATES_TRAIT__Disease: ["study_title", "trait_name", "source"],
  STUDY_INVESTIGATES_TRAIT__Phenotype: ["study_title", "trait_name", "source"],
  // Disease → Disease
  DISEASE_SUBCLASS_OF_DISEASE: ["src_name", "dst_name", "distance", "relationship_type", "source"],
  DISEASE_ANCESTOR_OF_DISEASE: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  // Pathway → Pathway
  PATHWAY_PART_OF_PATHWAY: ["src_name", "dst_name", "distance", "source"],
  PATHWAY_ANCESTOR_OF_PATHWAY: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  // Entity → Entity
  ENTITY_HIERARCHY: ["src_name", "dst_name", "distance", "source"],
  ENTITY_CLOSURE: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  // GO → GO
  GO_HIERARCHY: ["src_name", "dst_name", "distance", "source"],
  GO_CLOSURE: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
  // Metabolite
  PATHWAY_CONTAINS_METABOLITE: ["pathway_source", "pathway_name", "metabolite_name"],
  METABOLITE_IS_A_METABOLITE: ["src_name", "dst_name", "source"],
  // Signal
  SIGNAL_ASSOCIATED_WITH_TRAIT__Disease: ["p_value_mlog", "or_beta", "trait_name", "source"],
  SIGNAL_ASSOCIATED_WITH_TRAIT__Entity: ["p_value_mlog", "or_beta", "trait_name", "source"],
  SIGNAL_ASSOCIATED_WITH_TRAIT__Phenotype: ["p_value_mlog", "or_beta", "trait_name", "source"],
  SIGNAL_HAS_VARIANT: ["lead_variant", "posterior_probability", "source"],
  SIGNAL_IMPLIES_GENE: ["l2g_score", "confidence", "source"],
  // ProteinDomain → ProteinDomain
  DOMAIN_SUBCLASS_OF_DOMAIN: ["src_name", "dst_name", "distance", "source"],
  DOMAIN_ANCESTOR_OF_DOMAIN: ["distance", "relationship_type", "ancestor_name", "descendant_name"],
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

/**
 * Split edge types into batches where each batch's field union ≤ maxFields.
 * Greedy: adds edge types to the current batch until the next one would overflow.
 */
export function batchEdgeTypesByFieldLimit(
  edgeTypes: EdgeType[],
  maxFields: number = 50,
): EdgeType[][] {
  const batches: EdgeType[][] = [];
  let currentBatch: EdgeType[] = [];
  let currentFields = new Set<string>();

  for (const et of edgeTypes) {
    const typeFields = EDGE_TYPE_FIELDS[et] ?? [];
    const merged = new Set(currentFields);
    for (const f of typeFields) merged.add(f);

    if (merged.size > maxFields && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [et];
      currentFields = new Set(typeFields);
    } else {
      currentBatch.push(et);
      currentFields = merged;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Static database provenance per edge type.
 * Used as fallback when an edge row has no `source`/`sources` field.
 */
export const EDGE_TYPE_DATABASE: Record<EdgeType, string> = {
  // Gene → Disease
  GENE_ASSOCIATED_WITH_DISEASE: "OpenTargets",
  GENE_ALTERED_IN_DISEASE: "COSMIC",
  // Gene → Drug
  GENE_AFFECTS_DRUG_RESPONSE: "PharmGKB",
  // Gene → Entity
  GENE_ASSOCIATED_WITH_ENTITY: "GWAS Catalog",
  // Gene → Pathway
  GENE_PARTICIPATES_IN_PATHWAY: "Reactome",
  // Gene → GOTerm
  GENE_ANNOTATED_WITH_GO_TERM: "GOA",
  // Gene → Phenotype
  GENE_ASSOCIATED_WITH_PHENOTYPE: "HPO",
  // Gene → Gene
  GENE_INTERACTS_WITH_GENE: "BioGRID",
  GENE_PARALOG_OF_GENE: "Ensembl",
  // Gene → SideEffect
  GENE_ASSOCIATED_WITH_SIDE_EFFECT: "PharmGKB",
  // Gene → ProteinDomain
  GENE_HAS_PROTEIN_DOMAIN: "InterPro",
  // Gene → Tissue
  GENE_EXPRESSED_IN_TISSUE: "GTEx",
  // Drug → Gene
  DRUG_ACTS_ON_GENE: "OpenTargets",
  DRUG_DISPOSITION_BY_GENE: "PharmGKB",
  // Drug → Disease
  DRUG_INDICATED_FOR_DISEASE: "OpenTargets",
  // Drug → SideEffect
  DRUG_HAS_ADVERSE_EFFECT: "SIDER",
  DRUG_PAIR_CAUSES_SIDE_EFFECT: "TWOSIDES",
  // Drug → Drug
  DRUG_INTERACTS_WITH_DRUG: "DrugBank",
  // Variant → Gene
  VARIANT_IMPLIES_GENE: "OpenTargets",
  VARIANT_AFFECTS_GENE: "ClinVar",
  // Variant → Entity/Disease/Phenotype
  VARIANT_ASSOCIATED_WITH_TRAIT__Entity: "GWAS Catalog",
  VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype: "GWAS Catalog",
  VARIANT_ASSOCIATED_WITH_TRAIT__Disease: "ClinVar",
  // Variant → Drug
  VARIANT_ASSOCIATED_WITH_DRUG: "PharmGKB",
  // Variant → Study
  VARIANT_ASSOCIATED_WITH_STUDY: "GWAS Catalog",
  // Variant → SideEffect
  VARIANT_LINKED_TO_SIDE_EFFECT: "PharmGKB",
  // Variant → cCRE
  VARIANT_OVERLAPS_CCRE: "ENCODE",
  // cCRE → Gene
  CCRE_REGULATES_GENE: "ENCODE",
  // Disease → Phenotype
  DISEASE_HAS_PHENOTYPE: "MONDO",
  // Phenotype → Phenotype
  PHENOTYPE_EQUIVALENT_TO: "HPO",
  PHENOTYPE_HIERARCHY: "HPO",
  PHENOTYPE_CLOSURE: "HPO",
  // Study → trait
  STUDY_INVESTIGATES_TRAIT__Entity: "GWAS Catalog",
  STUDY_INVESTIGATES_TRAIT__Disease: "GWAS Catalog",
  STUDY_INVESTIGATES_TRAIT__Phenotype: "GWAS Catalog",
  // Disease → Disease
  DISEASE_SUBCLASS_OF_DISEASE: "MONDO",
  DISEASE_ANCESTOR_OF_DISEASE: "MONDO",
  // Pathway → Pathway
  PATHWAY_PART_OF_PATHWAY: "Reactome",
  PATHWAY_ANCESTOR_OF_PATHWAY: "Reactome",
  // Entity → Entity
  ENTITY_HIERARCHY: "EFO",
  ENTITY_CLOSURE: "EFO",
  // GO → GO
  GO_HIERARCHY: "Gene Ontology",
  GO_CLOSURE: "Gene Ontology",
  // Metabolite
  PATHWAY_CONTAINS_METABOLITE: "ConsensusPathDB",
  METABOLITE_IS_A_METABOLITE: "ChEBI",
  // Signal
  SIGNAL_ASSOCIATED_WITH_TRAIT__Disease: "GWAS Catalog",
  SIGNAL_ASSOCIATED_WITH_TRAIT__Entity: "GWAS Catalog",
  SIGNAL_ASSOCIATED_WITH_TRAIT__Phenotype: "GWAS Catalog",
  SIGNAL_HAS_VARIANT: "GWAS Catalog",
  SIGNAL_IMPLIES_GENE: "OpenTargets",
  // ProteinDomain → ProteinDomain
  DOMAIN_SUBCLASS_OF_DOMAIN: "InterPro",
  DOMAIN_ANCESTOR_OF_DOMAIN: "InterPro",
};

/**
 * Get the primary database provenance for an edge type.
 * Used for header chips and tooltips — the high-level "who created this edge".
 */
export function getEdgeDatabase(type: EdgeType): string {
  return EDGE_TYPE_DATABASE[type];
}

export const EDGE_TYPE_CONFIG: Record<EdgeType, { label: string; color: string; description: string }> = {
  // Gene → Disease (Red family)
  GENE_ASSOCIATED_WITH_DISEASE: { label: "Gene–Disease Association", color: "#ef4444", description: "Gene associated with disease (scored, curated, causal)" },
  GENE_ALTERED_IN_DISEASE: { label: "Gene Altered in Disease", color: "#dc2626", description: "Gene somatically altered in disease" },
  // Gene → Drug (Cyan family)
  GENE_AFFECTS_DRUG_RESPONSE: { label: "Gene Affects Drug Response", color: "#06b6d4", description: "Pharmacogenomic gene–drug interaction" },
  // Gene → Entity (Amber family)
  GENE_ASSOCIATED_WITH_ENTITY: { label: "Gene–Entity Association", color: "#f59e0b", description: "Gene associated with trait/entity via GWAS" },
  // Gene → Pathway (Purple family)
  GENE_PARTICIPATES_IN_PATHWAY: { label: "Participates in Pathway", color: "#8b5cf6", description: "Gene participates in pathway" },
  // Gene → GOTerm (Green family)
  GENE_ANNOTATED_WITH_GO_TERM: { label: "GO Annotation", color: "#a78bfa", description: "Gene annotated with GO term" },
  // Gene → Phenotype (Pink family)
  GENE_ASSOCIATED_WITH_PHENOTYPE: { label: "Gene–Phenotype Association", color: "#ec4899", description: "Gene associated with phenotype" },
  // Gene → Gene (Blue family)
  GENE_INTERACTS_WITH_GENE: { label: "Gene–Gene Interaction", color: "#3b82f6", description: "Protein-protein or functional interaction" },
  GENE_PARALOG_OF_GENE: { label: "Paralog", color: "#60a5fa", description: "Paralogous gene pair" },
  // Gene → SideEffect
  GENE_ASSOCIATED_WITH_SIDE_EFFECT: { label: "Gene–Side Effect", color: "#c084fc", description: "Gene associated with side effect" },
  // Gene → ProteinDomain
  GENE_HAS_PROTEIN_DOMAIN: { label: "Has Protein Domain", color: "#7c3aed", description: "Gene encodes protein domain" },
  // Gene → Tissue
  GENE_EXPRESSED_IN_TISSUE: { label: "Expressed in Tissue", color: "#14b8a6", description: "Gene expressed in tissue" },
  // Drug → Gene (Green family)
  DRUG_ACTS_ON_GENE: { label: "Drug Acts on Gene", color: "#22c55e", description: "Drug targets or acts on gene" },
  DRUG_DISPOSITION_BY_GENE: { label: "Drug Disposition by Gene", color: "#16a34a", description: "Drug disposition mediated by gene" },
  // Drug → Disease
  DRUG_INDICATED_FOR_DISEASE: { label: "Indicated for Disease", color: "#15803d", description: "Drug indicated for disease" },
  // Drug → SideEffect
  DRUG_HAS_ADVERSE_EFFECT: { label: "Adverse Effect", color: "#4ade80", description: "Drug has adverse effect" },
  DRUG_PAIR_CAUSES_SIDE_EFFECT: { label: "Drug Pair Side Effect", color: "#86efac", description: "Drug pair causes side effect" },
  // Drug → Drug
  DRUG_INTERACTS_WITH_DRUG: { label: "Drug–Drug Interaction", color: "#34d399", description: "Drug interacts with drug" },
  // Variant → Gene (Amber-orange family)
  VARIANT_IMPLIES_GENE: { label: "Variant Implies Gene", color: "#fb923c", description: "Variant implicates gene (L2G, regulatory, enhancer)" },
  VARIANT_AFFECTS_GENE: { label: "Variant Affects Gene", color: "#ea580c", description: "Variant affects gene (ClinVar, missense, somatic)" },
  // Variant → Entity/Disease/Phenotype (Yellow family)
  VARIANT_ASSOCIATED_WITH_TRAIT__Entity: { label: "Variant–Entity GWAS", color: "#eab308", description: "Variant GWAS associated with entity" },
  VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype: { label: "Variant–Phenotype GWAS", color: "#ca8a04", description: "Variant GWAS associated with phenotype" },
  VARIANT_ASSOCIATED_WITH_TRAIT__Disease: { label: "Variant–Disease Association", color: "#d97706", description: "Variant associated with disease (ClinVar/PGx)" },
  // Variant → Drug
  VARIANT_ASSOCIATED_WITH_DRUG: { label: "Variant–Drug Response", color: "#fbbf24", description: "Variant associated with drug response" },
  // Variant → Study
  VARIANT_ASSOCIATED_WITH_STUDY: { label: "Reported in Study", color: "#f59e0b", description: "Variant reported in GWAS study" },
  // Variant → SideEffect
  VARIANT_LINKED_TO_SIDE_EFFECT: { label: "Variant–Side Effect", color: "#fde047", description: "Variant linked to side effect" },
  // Variant → cCRE
  VARIANT_OVERLAPS_CCRE: { label: "Overlaps cCRE", color: "#facc15", description: "Variant overlaps cCRE" },
  // cCRE → Gene (Teal family)
  CCRE_REGULATES_GENE: { label: "Regulates Gene", color: "#0f766e", description: "cCRE regulates gene expression" },
  // Disease → Phenotype (Rose family)
  DISEASE_HAS_PHENOTYPE: { label: "Disease Has Phenotype", color: "#f43f5e", description: "Disease presents with phenotype" },
  // Phenotype → Phenotype
  PHENOTYPE_EQUIVALENT_TO: { label: "Phenotype Equivalent", color: "#d946ef", description: "Equivalent phenotype mapping" },
  PHENOTYPE_HIERARCHY: { label: "Phenotype Hierarchy", color: "#6b7280", description: "Phenotype subclass of" },
  PHENOTYPE_CLOSURE: { label: "Phenotype Closure", color: "#9ca3af", description: "Phenotype ancestor of" },
  // Study → trait (Teal family)
  STUDY_INVESTIGATES_TRAIT__Entity: { label: "Investigates Entity", color: "#14b8a6", description: "Study investigates entity" },
  STUDY_INVESTIGATES_TRAIT__Disease: { label: "Investigates Disease", color: "#0d9488", description: "Study investigates disease" },
  STUDY_INVESTIGATES_TRAIT__Phenotype: { label: "Investigates Phenotype", color: "#115e59", description: "Study investigates phenotype" },
  // Disease → Disease (Gray family)
  DISEASE_SUBCLASS_OF_DISEASE: { label: "Disease Subclass", color: "#6b7280", description: "Disease subclass of" },
  DISEASE_ANCESTOR_OF_DISEASE: { label: "Disease Ancestor", color: "#9ca3af", description: "Disease ancestor of" },
  // Pathway → Pathway (Indigo family)
  PATHWAY_PART_OF_PATHWAY: { label: "Part of Pathway", color: "#6366f1", description: "Pathway part of parent" },
  PATHWAY_ANCESTOR_OF_PATHWAY: { label: "Pathway Ancestor", color: "#818cf8", description: "Pathway ancestor of" },
  // Entity → Entity (Gray family)
  ENTITY_HIERARCHY: { label: "Entity Hierarchy", color: "#6b7280", description: "Entity subclass of" },
  ENTITY_CLOSURE: { label: "Entity Closure", color: "#9ca3af", description: "Entity ancestor of" },
  // GO → GO
  GO_HIERARCHY: { label: "GO Hierarchy", color: "#6b7280", description: "GO subclass of" },
  GO_CLOSURE: { label: "GO Closure", color: "#9ca3af", description: "GO ancestor of" },
  // Metabolite (Pink family)
  PATHWAY_CONTAINS_METABOLITE: { label: "Contains Metabolite", color: "#db2777", description: "Pathway contains metabolite" },
  METABOLITE_IS_A_METABOLITE: { label: "Metabolite Is A", color: "#be185d", description: "Metabolite is a subclass" },
  // Signal (Indigo-blue family)
  SIGNAL_ASSOCIATED_WITH_TRAIT__Disease: { label: "Signal–Disease", color: "#4f46e5", description: "Signal associated with disease" },
  SIGNAL_ASSOCIATED_WITH_TRAIT__Entity: { label: "Signal–Entity", color: "#6366f1", description: "Signal associated with entity" },
  SIGNAL_ASSOCIATED_WITH_TRAIT__Phenotype: { label: "Signal–Phenotype", color: "#818cf8", description: "Signal associated with phenotype" },
  SIGNAL_HAS_VARIANT: { label: "Signal Has Variant", color: "#a5b4fc", description: "Signal contains variant" },
  SIGNAL_IMPLIES_GENE: { label: "Signal Implies Gene", color: "#c7d2fe", description: "Signal implicates gene" },
  // ProteinDomain → ProteinDomain
  DOMAIN_SUBCLASS_OF_DOMAIN: { label: "Domain Subclass", color: "#6b7280", description: "Domain subclass of" },
  DOMAIN_ANCESTOR_OF_DOMAIN: { label: "Domain Ancestor", color: "#9ca3af", description: "Domain ancestor of" },
};
