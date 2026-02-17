import type { EdgeType } from "../types/edge";
import type { EntityType } from "../types/entity";

// =============================================================================
// Node Expansion Config
// =============================================================================

export interface ExpansionConfig {
  label: string;
  description: string;
  edgeTypes: EdgeType[];
  direction: "in" | "out" | "both";
  targetType: EntityType;
  icon: string;
  color: string;
  sort?: string;
  limit?: number;
}

export const NODE_EXPANSION_CONFIG: Record<EntityType, ExpansionConfig[]> = {
  Gene: [
    {
      label: "Find Diseases",
      description: "All disease associations (scored, curated, causal)",
      edgeTypes: ["ASSOCIATED_WITH_DISEASE", "CURATED_FOR", "CAUSES", "CIVIC_EVIDENCED_FOR",
        "PGX_ASSOCIATED", "THERAPEUTIC_TARGET_IN", "SCORED_FOR_DISEASE",
        "BIOMARKER_FOR", "INHERITED_CAUSE_OF", "ASSERTED_FOR_DISEASE"],
      direction: "out", targetType: "Disease", icon: "heart-pulse", color: "#ef4444",
      sort: "-overall_score", limit: 20,
    },
    {
      label: "Find Targeting Drugs",
      description: "Drugs that target this gene",
      edgeTypes: ["TARGETS", "TARGETS_IN_CONTEXT"],
      direction: "in", targetType: "Drug", icon: "target", color: "#22c55e",
      limit: 20,
    },
    {
      label: "Find Drug Interactions",
      description: "PGx and clinical drug evidence",
      edgeTypes: ["HAS_PGX_INTERACTION", "HAS_CLINICAL_DRUG_EVIDENCE", "ASSERTED_FOR_DRUG"],
      direction: "out", targetType: "Drug", icon: "pill", color: "#06b6d4",
      limit: 20,
    },
    {
      label: "Find Interactions",
      description: "Protein-protein and functional interactions",
      edgeTypes: ["INTERACTS_WITH", "INTERACTS_IN_PATHWAY", "REGULATES", "FUNCTIONALLY_RELATED"],
      direction: "out", targetType: "Gene", icon: "network", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Pathways",
      description: "Pathways this gene participates in",
      edgeTypes: ["PARTICIPATES_IN"],
      direction: "out", targetType: "Pathway", icon: "route", color: "#8b5cf6",
      limit: 20,
    },
    {
      label: "Find Phenotypes",
      description: "Human and mouse phenotype manifestations",
      edgeTypes: ["MANIFESTS_AS", "MOUSE_MANIFESTS_AS"],
      direction: "out", targetType: "Phenotype", icon: "activity", color: "#ec4899",
      limit: 20,
    },
    {
      label: "Find Traits",
      description: "GWAS traits this gene is scored for",
      edgeTypes: ["SCORED_FOR_TRAIT"],
      direction: "out", targetType: "Trait", icon: "bar-chart", color: "#f59e0b",
      limit: 20,
    },
    {
      label: "Find Variants",
      description: "GWAS variants linked to this gene",
      edgeTypes: ["HAS_GWAS_VARIANT"],
      direction: "out", targetType: "Variant", icon: "dna", color: "#d97706",
      limit: 20,
    },
    {
      label: "Find GO Terms",
      description: "Gene Ontology annotations",
      edgeTypes: ["ANNOTATED_WITH"],
      direction: "out", targetType: "GOTerm", icon: "tag", color: "#16a34a",
      limit: 20,
    },
    {
      label: "Find Side Effects",
      description: "Side effects associated with this gene",
      edgeTypes: ["ASSOCIATED_WITH_SIDE_EFFECT"],
      direction: "out", targetType: "SideEffect", icon: "alert-triangle", color: "#ca8a04",
      limit: 20,
    },
    {
      label: "Find Regulatory Elements",
      description: "cCREs that regulate this gene (ENCODE)",
      edgeTypes: ["EXPERIMENTALLY_REGULATES", "COMPUTATIONALLY_REGULATES"],
      direction: "in", targetType: "cCRE", icon: "microscope", color: "#0891b2",
      limit: 20,
    },
  ],
  Disease: [
    {
      label: "Find Genes",
      description: "Genes associated with this disease",
      edgeTypes: ["ASSOCIATED_WITH_DISEASE", "CURATED_FOR", "CAUSES", "CIVIC_EVIDENCED_FOR",
        "PGX_ASSOCIATED", "THERAPEUTIC_TARGET_IN", "SCORED_FOR_DISEASE",
        "BIOMARKER_FOR", "INHERITED_CAUSE_OF", "ASSERTED_FOR_DISEASE"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#3b82f6",
      sort: "-overall_score", limit: 20,
    },
    {
      label: "Find Treatments",
      description: "Drugs indicated for this disease",
      edgeTypes: ["INDICATED_FOR"],
      direction: "in", targetType: "Drug", icon: "pill", color: "#14b8a6",
      limit: 20,
    },
    {
      label: "Find Phenotypes",
      description: "Phenotypes this disease presents with",
      edgeTypes: ["PRESENTS_WITH"],
      direction: "out", targetType: "Phenotype", icon: "activity", color: "#f43f5e",
      limit: 20,
    },
    {
      label: "Find Traits",
      description: "Traits mapped to this disease",
      edgeTypes: ["MAPS_TO"],
      direction: "in", targetType: "Trait", icon: "bar-chart", color: "#f59e0b",
      limit: 20,
    },
    {
      label: "Find Variants",
      description: "ClinVar and PGx variant associations",
      edgeTypes: ["CLINVAR_ASSOCIATED", "PGX_DISEASE_ASSOCIATED"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#eab308",
      limit: 20,
    },
    {
      label: "Find Parent Diseases",
      description: "Broader disease categories in the ontology",
      edgeTypes: ["SUBCLASS_OF"],
      direction: "out", targetType: "Disease", icon: "arrow-up", color: "#6366f1",
      limit: 10,
    },
    {
      label: "Find Sub-diseases",
      description: "More specific disease subtypes",
      edgeTypes: ["SUBCLASS_OF"],
      direction: "in", targetType: "Disease", icon: "arrow-down", color: "#a855f7",
      limit: 20,
    },
  ],
  Drug: [
    {
      label: "Find Targets",
      description: "Genes this drug targets",
      edgeTypes: ["TARGETS", "TARGETS_IN_CONTEXT"],
      direction: "out", targetType: "Gene", icon: "target", color: "#22c55e",
      limit: 20,
    },
    {
      label: "Find Indications",
      description: "Diseases this drug is indicated for",
      edgeTypes: ["INDICATED_FOR"],
      direction: "out", targetType: "Disease", icon: "heart-pulse", color: "#14b8a6",
      limit: 20,
    },
    {
      label: "Find Side Effects",
      description: "Adverse reactions and side effect frequencies",
      edgeTypes: ["HAS_SIDE_EFFECT", "HAS_ADVERSE_REACTION"],
      direction: "out", targetType: "SideEffect", icon: "alert-triangle", color: "#f59e0b",
      limit: 20,
    },
    {
      label: "Find PGx Genes",
      description: "Genes with pharmacogenomic interactions",
      edgeTypes: ["HAS_PGX_INTERACTION", "HAS_CLINICAL_DRUG_EVIDENCE", "ASSERTED_FOR_DRUG"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#06b6d4",
      limit: 20,
    },
    {
      label: "Find PGx Variants",
      description: "Variants affecting drug response",
      edgeTypes: ["AFFECTS_RESPONSE_TO", "PGX_RESPONSE_FOR", "STUDIED_FOR_DRUG_RESPONSE",
        "FUNCTIONALLY_ASSAYED_FOR", "PGX_CLINICAL_RESPONSE"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#d97706",
      limit: 20,
    },
  ],
  Pathway: [
    {
      label: "Find Genes",
      description: "Genes that participate in this pathway",
      edgeTypes: ["PARTICIPATES_IN"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Parent Pathways",
      description: "Parent pathway hierarchy",
      edgeTypes: ["PART_OF"],
      direction: "out", targetType: "Pathway", icon: "arrow-up", color: "#6366f1",
      limit: 10,
    },
    {
      label: "Find Child Pathways",
      description: "Sub-pathways within this pathway",
      edgeTypes: ["PART_OF"],
      direction: "in", targetType: "Pathway", icon: "arrow-down", color: "#a855f7",
      limit: 20,
    },
    {
      label: "Find Metabolites",
      description: "Metabolites in this pathway",
      edgeTypes: ["CONTAINS_METABOLITE"],
      direction: "out", targetType: "Metabolite", icon: "beaker", color: "#db2777",
      limit: 20,
    },
  ],
  Phenotype: [
    {
      label: "Find Genes",
      description: "Genes that manifest this phenotype",
      edgeTypes: ["MANIFESTS_AS", "MOUSE_MANIFESTS_AS"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Diseases",
      description: "Diseases that present with this phenotype",
      edgeTypes: ["PRESENTS_WITH"],
      direction: "in", targetType: "Disease", icon: "heart-pulse", color: "#ef4444",
      limit: 20,
    },
    {
      label: "Find Traits",
      description: "Traits that present with this phenotype",
      edgeTypes: ["TRAIT_PRESENTS_WITH"],
      direction: "in", targetType: "Trait", icon: "bar-chart", color: "#f59e0b",
      limit: 20,
    },
  ],
  Variant: [
    {
      label: "Find Affected Genes",
      description: "Genes this variant is predicted to affect (L2G, regulatory, positional)",
      edgeTypes: ["PREDICTED_TO_AFFECT", "ENHANCER_LINKED_TO", "PREDICTED_REGULATORY_TARGET",
        "POSITIONALLY_LINKED_TO", "MISSENSE_PATHOGENIC_FOR", "CLINVAR_ANNOTATED_IN", "SOMATICALLY_MUTATED_IN"],
      direction: "out", targetType: "Gene", icon: "dna", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Traits",
      description: "GWAS-associated traits",
      edgeTypes: ["GWAS_ASSOCIATED_WITH"],
      direction: "out", targetType: "Trait", icon: "activity", color: "#eab308",
      sort: "-p_value_mlog", limit: 20,
    },
    {
      label: "Find Diseases",
      description: "ClinVar and PGx disease associations",
      edgeTypes: ["CLINVAR_ASSOCIATED", "PGX_DISEASE_ASSOCIATED"],
      direction: "out", targetType: "Disease", icon: "heart-pulse", color: "#ef4444",
      limit: 20,
    },
    {
      label: "Find Drug Responses",
      description: "Pharmacogenomic drug response evidence",
      edgeTypes: ["AFFECTS_RESPONSE_TO", "PGX_RESPONSE_FOR", "STUDIED_FOR_DRUG_RESPONSE",
        "FUNCTIONALLY_ASSAYED_FOR", "PGX_CLINICAL_RESPONSE"],
      direction: "out", targetType: "Drug", icon: "pill", color: "#22c55e",
      limit: 20,
    },
    {
      label: "Find cCREs",
      description: "Overlapping regulatory elements",
      edgeTypes: ["OVERLAPS"],
      direction: "out", targetType: "cCRE", icon: "microscope", color: "#0891b2",
      limit: 20,
    },
    {
      label: "Find Studies",
      description: "GWAS studies reporting this variant",
      edgeTypes: ["REPORTED_IN"],
      direction: "out", targetType: "Study", icon: "book-open", color: "#0284c7",
      limit: 20,
    },
    {
      label: "Find Side Effects",
      description: "Side effects linked to this variant",
      edgeTypes: ["LINKED_TO_SIDE_EFFECT"],
      direction: "out", targetType: "SideEffect", icon: "alert-triangle", color: "#ca8a04",
      limit: 20,
    },
  ],
  Trait: [
    {
      label: "Find Genes",
      description: "Genes scored for this trait",
      edgeTypes: ["SCORED_FOR_TRAIT"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Variants",
      description: "GWAS-associated variants",
      edgeTypes: ["GWAS_ASSOCIATED_WITH"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#f59e0b",
      sort: "-p_value_mlog", limit: 20,
    },
    {
      label: "Find Studies",
      description: "GWAS studies investigating this trait",
      edgeTypes: ["INVESTIGATES"],
      direction: "in", targetType: "Study", icon: "book-open", color: "#0284c7",
      limit: 20,
    },
    {
      label: "Find Diseases",
      description: "Diseases this trait maps to",
      edgeTypes: ["MAPS_TO"],
      direction: "out", targetType: "Disease", icon: "heart-pulse", color: "#d946ef",
      limit: 20,
    },
    {
      label: "Find Phenotypes",
      description: "Phenotypes this trait presents with",
      edgeTypes: ["TRAIT_PRESENTS_WITH"],
      direction: "out", targetType: "Phenotype", icon: "activity", color: "#ec4899",
      limit: 20,
    },
  ],
  Study: [
    {
      label: "Find Traits",
      description: "Traits this study investigates",
      edgeTypes: ["INVESTIGATES"],
      direction: "out", targetType: "Trait", icon: "activity", color: "#14b8a6",
      limit: 20,
    },
    {
      label: "Find Variants",
      description: "Variants reported in this study",
      edgeTypes: ["REPORTED_IN"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#0284c7",
      limit: 20,
    },
  ],
  GOTerm: [
    {
      label: "Find Genes",
      description: "Genes annotated with this GO term",
      edgeTypes: ["ANNOTATED_WITH"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#16a34a",
      limit: 20,
    },
    {
      label: "Find Parent Terms",
      description: "Broader GO terms in the hierarchy",
      edgeTypes: ["GO_SUBCLASS_OF"],
      direction: "out", targetType: "GOTerm", icon: "arrow-up", color: "#6b7280",
      limit: 10,
    },
    {
      label: "Find Child Terms",
      description: "More specific GO terms",
      edgeTypes: ["GO_SUBCLASS_OF"],
      direction: "in", targetType: "GOTerm", icon: "arrow-down", color: "#4b5563",
      limit: 20,
    },
  ],
  SideEffect: [
    {
      label: "Find Drugs",
      description: "Drugs causing this side effect",
      edgeTypes: ["HAS_SIDE_EFFECT", "HAS_ADVERSE_REACTION"],
      direction: "in", targetType: "Drug", icon: "pill", color: "#ca8a04",
      limit: 20,
    },
    {
      label: "Find Genes",
      description: "Genes associated with this side effect",
      edgeTypes: ["ASSOCIATED_WITH_SIDE_EFFECT"],
      direction: "in", targetType: "Gene", icon: "dna", color: "#3b82f6",
      limit: 20,
    },
    {
      label: "Find Variants",
      description: "Variants linked to this side effect",
      edgeTypes: ["LINKED_TO_SIDE_EFFECT"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#d97706",
      limit: 20,
    },
  ],
  OntologyTerm: [
    {
      label: "Find Side Effects",
      description: "Side effects mapped to this term",
      edgeTypes: ["SE_MAPS_TO"],
      direction: "in", targetType: "SideEffect", icon: "alert-triangle", color: "#ca8a04",
      limit: 20,
    },
  ],
  cCRE: [
    {
      label: "Find Regulated Genes",
      description: "Genes this element regulates",
      edgeTypes: ["EXPERIMENTALLY_REGULATES", "COMPUTATIONALLY_REGULATES"],
      direction: "out", targetType: "Gene", icon: "dna", color: "#0891b2",
      limit: 20,
    },
    {
      label: "Find Overlapping Variants",
      description: "Variants overlapping this cCRE",
      edgeTypes: ["OVERLAPS"],
      direction: "in", targetType: "Variant", icon: "microscope", color: "#f59e0b",
      limit: 20,
    },
  ],
  Metabolite: [
    {
      label: "Find Pathways",
      description: "Pathways containing this metabolite",
      edgeTypes: ["CONTAINS_METABOLITE"],
      direction: "in", targetType: "Pathway", icon: "route", color: "#db2777",
      limit: 20,
    },
  ],
};
