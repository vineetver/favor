export interface SubCategory {
  text: string;
  slug: string;
}

export interface NavigationCategory {
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

export const VARIANT_NAVIGATION: NavigationCategory[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    subCategories: [
      { text: "Variant Summary", slug: "llm-summary" },
      { text: "Basic Information", slug: "basic" },
      { text: "Category", slug: "category" },
      { text: "Clinvar", slug: "clinvar" },
      { text: "Overall AF", slug: "overall-af" },
      { text: "Ancestry Specific AF", slug: "ancestry-af" },
      { text: "Gender AF Male", slug: "gender-af-male" },
      { text: "Gender AF Female", slug: "gender-af-female" },
      { text: "Integrative Score", slug: "integrative" },
      { text: "Protein Function", slug: "protein-function" },
      { text: "Conservation", slug: "conservation" },
      { text: "Epigenetics", slug: "epigenetics" },
      { text: "Transcription Factors", slug: "transcription-factors" },
      { text: "Chromatin States", slug: "chromatin-states" },
      {
        text: "Local Nucleotide Diversity",
        slug: "local-nucleotide-diversity",
      },
      { text: "Mutation Density", slug: "mutation-density" },
      { text: "Mappability", slug: "mappability" },
      { text: "Proximity Table", slug: "proximity-table" },
      { text: "Mutation Rate", slug: "mutation-rate" },
      { text: "Alphamissense", slug: "alphamissense" },
      { text: "SpliceAI", slug: "spliceai" },
      { text: "Cosmic", slug: "cosmic" },
      { text: "GWAS Catalog", slug: "gwas-catalog" },
    ],
  },
  {
    name: "Cell/Tissue Annotation",
    slug: "single-cell-tissue",
    subCategories: [
      { text: "cCREs", slug: "ccres" },
      { text: "CATlas", slug: "catlas" },
      { text: "ENTEx", slug: "entex" },
      { text: "SCENT", slug: "scent" },
      { text: "cV2F", slug: "cv2f" },
      { text: "pgBoost", slug: "pgboost" },
    ],
  },
  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];
