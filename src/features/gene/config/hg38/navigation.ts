import type { GeneNavigationSection } from "@features/gene/types";

export const GENE_NAVIGATION_CONFIG: GeneNavigationSection[] = [
  {
    name: "Gene Level Annotation",
    slug: "gene-level-annotation",
    // Flat list for mobile navigation (backward compatible)
    // Ordered by general information to specific functional details
    subCategories: [
      // Overview
      { text: "LLM Summary", slug: "llm-summary" },
      { text: "Info and IDs", slug: "info-and-ids" },
      // Function
      { text: "Function", slug: "function" },
      // Phenotypes
      { text: "Human Phenotype", slug: "human-phenotype" },
      { text: "Animal Phenotype", slug: "animal-phenotype" },
      // Expression & Protein
      { text: "Expression", slug: "expression" },
      { text: "Protein-Protein Interactions", slug: "protein-protein-interactions" },
      { text: "Pathways", slug: "pathways" },
      // Constraints
      { text: "Constraints and Haploinsufficiency", slug: "constraints-and-heplo" },
    ],
    // Grouped structure for desktop sidebar
    // Organized by functional categories
    groups: [
      {
        name: "Overview",
        defaultExpanded: true,
        items: [
          { text: "LLM Summary", slug: "llm-summary", icon: "sparkles" },
          { text: "Info and IDs", slug: "info-and-ids", icon: "file-text" },
        ],
      },
      {
        name: "Function & Annotation",
        defaultExpanded: true,
        items: [
          { text: "Function", slug: "function", icon: "dna" },
        ],
      },
      {
        name: "Phenotypes & Disease",
        defaultExpanded: true,
        items: [
          { text: "Human Phenotype", slug: "human-phenotype", icon: "users" },
          { text: "Animal Phenotype", slug: "animal-phenotype", icon: "bug" },
        ],
      },
      {
        name: "Expression & Protein Networks",
        defaultExpanded: true,
        items: [
          { text: "Expression", slug: "expression", icon: "activity" },
          { text: "Protein-Protein Interactions", slug: "protein-protein-interactions", icon: "share-2" },
          { text: "Pathways", slug: "pathways", icon: "git-branch" },
        ],
      },
      {
        name: "Constraint & Variation Intolerance",
        defaultExpanded: true,
        items: [
          { text: "Constraints and Haploinsufficiency", slug: "constraints-and-heplo", icon: "shield-alert" },
        ],
      },
    ],
  },
  {
    name: "SNV Summary",
    slug: "SNV-summary",
    subCategories: [
      { text: "Allele Distribution", slug: "allele-distribution" },
      { text: "Gencode Comprehensive Category", slug: "genecode-comprehensive-category" },
      { text: "Clinvar Clinical Significance", slug: "clinvar" },
      { text: "Functional Consequences", slug: "functional-consequences" },
      { text: "High Integrative Score ( >= 10)", slug: "high-integrative-score" },
    ],
    groups: [
      {
        name: "SNV Distribution & Classification",
        defaultExpanded: true,
        items: [
          { text: "Allele Distribution", slug: "allele-distribution", icon: "pie-chart" },
          { text: "Gencode Comprehensive Category", slug: "genecode-comprehensive-category", icon: "layers" },
          { text: "Functional Consequences", slug: "functional-consequences", icon: "git-branch" },
        ],
      },
      {
        name: "Clinical & Pathogenicity",
        defaultExpanded: true,
        items: [
          { text: "Clinvar Clinical Significance", slug: "clinvar", icon: "heart-pulse" },
          { text: "High Integrative Score ( >= 10)", slug: "high-integrative-score", icon: "brain" },
        ],
      },
    ],
  },
  {
    name: "InDel Summary",
    slug: "InDel-summary",
    subCategories: [
      { text: "Allele Distribution", slug: "allele-distribution" },
      { text: "Genecode Comprehensive Category", slug: "genecode-comprehensive-category" },
      { text: "Clinvar Clinical Significance", slug: "clinvar" },
      { text: "Functional Consequences", slug: "functional-consequences" },
    ],
    groups: [
      {
        name: "InDel Distribution & Classification",
        defaultExpanded: true,
        items: [
          { text: "Allele Distribution", slug: "allele-distribution", icon: "pie-chart" },
          { text: "Genecode Comprehensive Category", slug: "genecode-comprehensive-category", icon: "layers" },
          { text: "Functional Consequences", slug: "functional-consequences", icon: "git-branch" },
        ],
      },
      {
        name: "Clinical Significance",
        defaultExpanded: true,
        items: [
          { text: "Clinvar Clinical Significance", slug: "clinvar", icon: "heart-pulse" },
        ],
      },
    ],
  },
  {
    name: "Cell/Tissue Annotation",
    slug: "tissue-specific",
    subCategories: [
      { text: "cCREs", slug: "ccres" },
      { text: "CATlas", slug: "catlas" },
      { text: "Epimap", slug: "epimap" },
      { text: "cV2F", slug: "cv2f" },
      { text: "pgBoost", slug: "pgboost" },
      { text: "SCENT", slug: "scent" },
      { text: "ENTEx", slug: "entex" },
      { text: "Vista Enhancers", slug: "vista-enhancers" },
    ],
    groups: [
      {
        name: "Regulatory Elements",
        defaultExpanded: true,
        items: [
          { text: "cCREs", slug: "ccres", icon: "target" },
          { text: "Vista Enhancers", slug: "vista-enhancers", icon: "eye" },
        ],
      },
      {
        name: "Cell Type & Tissue Specificity",
        defaultExpanded: true,
        items: [
          { text: "CATlas", slug: "catlas", icon: "layers" },
          { text: "ENTEx", slug: "entex", icon: "book-open" },
          { text: "SCENT", slug: "scent", icon: "scan" },
        ],
      },
      {
        name: "Epigenetic States",
        defaultExpanded: true,
        items: [
          { text: "Epimap", slug: "epimap", icon: "map" },
        ],
      },
      {
        name: "Variant-to-Function Prediction",
        defaultExpanded: true,
        items: [
          { text: "cV2F", slug: "cv2f", icon: "link" },
          { text: "pgBoost", slug: "pgboost", icon: "zap" },
        ],
      },
    ],
  },
  {
    name: "Full Tables",
    slug: "full-tables",
    subCategories: [
      { text: "SNV Table", slug: "SNV-table" },
      { text: "InDel Table", slug: "InDel-table" },
      { text: "Somatic Mutation", slug: "cosmic" },
    ],
    groups: [
      {
        name: "Germline Variants",
        defaultExpanded: true,
        items: [
          { text: "SNV Table", slug: "SNV-table", icon: "table" },
          { text: "InDel Table", slug: "InDel-table", icon: "table" },
        ],
      },
      {
        name: "Somatic Variants",
        defaultExpanded: true,
        items: [
          { text: "Somatic Mutation", slug: "cosmic", icon: "target" },
        ],
      },
    ],
  },
  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];
