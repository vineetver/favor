import type { VariantNavigationSection } from "@features/variant/types";

export const VARIANT_NAVIGATION_CONFIG: VariantNavigationSection[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    // Flat list for mobile navigation (backward compatible).
    // Mirrors the grouped order below.
    subCategories: [
      // Overview
      { text: "Variant Summary", slug: "llm-summary" },
      { text: "Basic Information", slug: "basic" },
      { text: "Functional Class", slug: "functional-class" },
      { text: "Integrative Score", slug: "integrative" },
      // Clinical & Disease
      { text: "Clinvar", slug: "clinvar" },
      { text: "Pharmacogenomics", slug: "pharmacogenomics" },
      { text: "Somatic Mutation", slug: "somatic-mutation" },
      // Predicted Impact
      { text: "Protein Function", slug: "protein-function" },
      { text: "Protein Structure", slug: "protein-structure" },
      { text: "SpliceAI", slug: "splice-ai" },
      { text: "Conservation", slug: "conservation" },
      // Population Genetics
      { text: "Allele Frequency", slug: "allele-frequency" },
      {
        text: "Local Nucleotide Diversity",
        slug: "local-nucleotide-diversity",
      },
      {
        text: "Expected Rate of De Novo Mutation",
        slug: "expected-rate-of-de-novo-mutation",
      },
      // GWAS & Genetic Association
      { text: "GWAS Catalog", slug: "gwas-catalog" },
      { text: "GWAS Fine-Mapping", slug: "credible-sets" },
      { text: "Locus-to-Gene", slug: "l2g-scores" },
      // Regulatory & Epigenetics
      { text: "Chromatin State", slug: "chromatin-state" },
      { text: "Epigenetics", slug: "epigenetics" },
      { text: "Transcription Factors", slug: "transcription-factors" },
      // Technical
      { text: "Mappability", slug: "mappability" },
    ],
    // Grouped structure for desktop sidebar.
    showIcons: false,
    groups: [
      {
        name: "Overview",
        defaultExpanded: true,
        items: [
          { text: "Variant Summary", slug: "llm-summary" },
          { text: "Basic Information", slug: "basic" },
          { text: "Functional Class", slug: "functional-class" },
          { text: "Integrative Score", slug: "integrative" },
        ],
      },
      {
        name: "Clinical & Disease",
        defaultExpanded: true,
        items: [
          { text: "Clinvar", slug: "clinvar" },
          { text: "Pharmacogenomics", slug: "pharmacogenomics" },
          { text: "Somatic Mutation", slug: "somatic-mutation" },
        ],
      },
      {
        name: "Predicted Impact",
        defaultExpanded: true,
        items: [
          { text: "Protein Function", slug: "protein-function" },
          { text: "Protein Structure", slug: "protein-structure" },
          { text: "SpliceAI", slug: "splice-ai" },
          { text: "Conservation", slug: "conservation" },
        ],
      },
      {
        name: "Population Genetics",
        defaultExpanded: true,
        items: [
          { text: "Allele Frequency", slug: "allele-frequency" },
          {
            text: "Local Nucleotide Diversity",
            slug: "local-nucleotide-diversity",
          },
          {
            text: "Expected Rate of De Novo Mutation",
            slug: "expected-rate-of-de-novo-mutation",
          },
        ],
      },
      {
        name: "GWAS & Genetic Association",
        defaultExpanded: true,
        items: [
          { text: "GWAS Catalog", slug: "gwas-catalog" },
          { text: "GWAS Fine-Mapping", slug: "credible-sets" },
          { text: "Locus-to-Gene", slug: "l2g-scores" },
        ],
      },
      {
        name: "Regulatory & Epigenetics",
        defaultExpanded: true,
        items: [
          { text: "Chromatin State", slug: "chromatin-state" },
          { text: "Epigenetics", slug: "epigenetics" },
          { text: "Transcription Factors", slug: "transcription-factors" },
        ],
      },
      {
        name: "Technical",
        defaultExpanded: true,
        items: [{ text: "Mappability", slug: "mappability" }],
      },
    ],
  },
  {
    name: "Regulatory Evidence",
    slug: "regulatory",
    subCategories: [],
  },
  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];
