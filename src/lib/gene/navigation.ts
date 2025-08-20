export interface SubCategory {
  text: string;
  slug: string;
}

export interface NavigationCategory {
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

export const GENE_NAVIGATION: NavigationCategory[] = [
  {
    name: "Gene Level Annotation",
    slug: "gene-level-annotation",
    subCategories: [
      { text: "Info and IDs", slug: "info-and-ids" },
      { text: "Function", slug: "function" },
      { text: "Human Phenotype", slug: "human-phenotype" },
      { text: "Animal Phenotype", slug: "animal-phenotype" },
      { text: "Expression", slug: "expression" },
      {
        text: "Protein-Protein Interactions",
        slug: "protein-protein-interactions",
      },
      { text: "Pathways", slug: "pathways" },
      {
        text: "Constraints and Haploinsufficiency",
        slug: "constraints-and-heplo",
      },
    ],
  },
  {
    name: "SNV Summary",
    slug: "SNV-summary",
    subCategories: [
      { text: "Allele Distribution", slug: "allele-distribution" },
      {
        text: "Genecode Comprehensive Category",
        slug: "genecode-comprehensive-category",
      },
      { text: "Clinvar Clinical Significance", slug: "clinvar" },
      { text: "Functional Consequences", slug: "functional-consequences" },
      {
        text: "High Integrative Score ( >= 10)",
        slug: "high-integrative-score",
      },
    ],
  },
  {
    name: "InDel Summary",
    slug: "InDel-summary",
    subCategories: [
      { text: "Allele Distribution", slug: "allele-distribution" },
      {
        text: "Genecode Comprehensive Category",
        slug: "genecode-comprehensive-category",
      },
      { text: "Clinvar Clinical Significance", slug: "clinvar" },
      {
        text: "Functional Consequences",
        slug: "functional-consequences",
      },
    ],
  },
  {
    name: "Single Cell/Tissue",
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
  },
  {
    name: "Full Tables",
    slug: "full-tables",
    subCategories: [
      { text: "SNV Table", slug: "SNV-table" },
      { text: "InDel Table", slug: "InDel-table" },
      { text: "Cosmic", slug: "cosmic" },
    ],
  },
  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];
