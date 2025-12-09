export interface VariantNavigationLink {
  text: string;
  slug: string;
}

export interface VariantNavigationSection {
  name: string;
  slug: string;
  subCategories: VariantNavigationLink[];
}

export const VARIANT_NAVIGATION_CONFIG: VariantNavigationSection[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    subCategories: [
      { text: "Variant Summary", slug: "llm-summary" },
      { text: "Basic Information", slug: "basic" },
      { text: "Functional Class", slug: "functional-class" },
      { text: "Clinvar", slug: "clinvar" },
      { text: "Allele Frequency", slug: "allele-frequency" },
      { text: "Integrative Score", slug: "integrative" },
      { text: "Protein Function", slug: "protein-function" },
      { text: "Conservation", slug: "conservation" },
      { text: "Epigenetics", slug: "epigenetics" },
      { text: "Transcription Factors", slug: "transcription-factors" },
      { text: "Chromatin State", slug: "chromatin-state" },
      {
        text: "Local Nucleotide Diversity",
        slug: "local-nucleotide-diversity",
      },
      { text: "Expected Rate of De Novo Mutation", slug: "expected-rate-of-de-novo-mutation" },
      { text: "Mappability", slug: "mappability" },
      { text: "Proximity Table", slug: "proximity-table" },
      { text: "SpliceAI", slug: "splice-ai" },
      { text: "Somatic Mutation", slug: "somatic-mutation" },
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
