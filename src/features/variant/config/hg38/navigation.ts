import type { VariantNavigationSection } from "@features/variant/types";

export const VARIANT_NAVIGATION_CONFIG: VariantNavigationSection[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    // Flat list for mobile navigation (backward compatible)
    // Ordered by clinical impact and actionability
    subCategories: [
      // Overview - context first
      { text: "Variant Summary", slug: "llm-summary" },
      { text: "Basic Information", slug: "basic" },
      { text: "Functional Class", slug: "functional-class" },
      { text: "Integrative Score", slug: "integrative" },
      // Clinical & Disease - high priority
      { text: "Clinvar", slug: "clinvar" },
      { text: "Disease Evidence", slug: "evidences" },
      { text: "Pharmacogenomics", slug: "pharmacogenomics" },
      { text: "Somatic Mutation", slug: "somatic-mutation" },
      // Pathogenicity & Scores
      { text: "Pathogenicity", slug: "variant-effects" },
      { text: "Protein Function", slug: "protein-function" },
      { text: "Protein Structure", slug: "protein-structure" },
      { text: "Conservation", slug: "conservation" },
      { text: "SpliceAI", slug: "splice-ai" },
      { text: "Consequences (VEP)", slug: "consequences" },
      // GWAS & Association
      { text: "GWAS Catalog", slug: "gwas-catalog" },
      { text: "GWAS Fine-Mapping", slug: "credible-sets" },
      { text: "Locus-to-Gene", slug: "l2g-scores" },
      // Regulatory & Epigenetics
      { text: "Epigenetics", slug: "epigenetics" },
      { text: "Chromatin State", slug: "chromatin-state" },
      { text: "Transcription Factors", slug: "transcription-factors" },
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
      // Technical
      { text: "Mappability", slug: "mappability" },
    ],
    // Grouped structure for desktop sidebar
    // Ordered by clinical impact and actionability
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
          { text: "Disease Evidence", slug: "evidences" },
          { text: "Pharmacogenomics", slug: "pharmacogenomics" },
          { text: "Somatic Mutation", slug: "somatic-mutation" },
        ],
      },
      {
        name: "Pathogenicity & Scores",
        defaultExpanded: true,
        items: [
          { text: "Pathogenicity", slug: "variant-effects" },
          { text: "Protein Function", slug: "protein-function" },
          { text: "Protein Structure", slug: "protein-structure" },
          { text: "Conservation", slug: "conservation" },
          { text: "SpliceAI", slug: "splice-ai" },
          { text: "Consequences (VEP)", slug: "consequences" },
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
          { text: "Epigenetics", slug: "epigenetics" },
          { text: "Chromatin State", slug: "chromatin-state" },
          { text: "Transcription Factors", slug: "transcription-factors" },
        ],
      },
      {
        name: "Population Genetics",
        defaultExpanded: true,
        items: [
          { text: "Allele Frequency", slug: "allele-frequency" },
          { text: "Local Nucleotide Diversity", slug: "local-nucleotide-diversity" },
          { text: "Expected Rate of De Novo Mutation", slug: "expected-rate-of-de-novo-mutation" },
        ],
      },
      {
        name: "Technical",
        defaultExpanded: true,
        items: [
          { text: "Mappability", slug: "mappability" },
        ],
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
