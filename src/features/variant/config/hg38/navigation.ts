import type { VariantNavigationSection } from "@features/variant/types";

export const VARIANT_NAVIGATION_CONFIG: VariantNavigationSection[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    // Flat list for mobile navigation (backward compatible)
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
      {
        text: "Expected Rate of De Novo Mutation",
        slug: "expected-rate-of-de-novo-mutation",
      },
      { text: "Mappability", slug: "mappability" },
      { text: "Proximity Table", slug: "proximity-table" },
      { text: "SpliceAI", slug: "splice-ai" },
      { text: "Somatic Mutation", slug: "somatic-mutation" },
      { text: "GWAS Catalog", slug: "gwas-catalog" },
    ],
    // Grouped structure for desktop sidebar
    groups: [
      {
        name: "Overview",
        defaultExpanded: true,
        items: [
          { text: "Variant Summary", slug: "llm-summary", icon: "sparkles" },
          { text: "Basic Information", slug: "basic", icon: "file-text" },
          { text: "Functional Class", slug: "functional-class", icon: "dna" },
          { text: "Proximity Table", slug: "proximity-table", icon: "map-pin" },
          { text: "Mappability", slug: "mappability", icon: "microscope" },
        ],
      },
      {
        name: "Population Genetics",
        defaultExpanded: true,
        items: [
          { text: "Allele Frequency", slug: "allele-frequency", icon: "users" },
          {
            text: "Local Nucleotide Diversity",
            slug: "local-nucleotide-diversity",
            icon: "pie-chart",
          },
          {
            text: "Expected Rate of De Novo Mutation",
            slug: "expected-rate-of-de-novo-mutation",
            icon: "git-branch",
          },
        ],
      },
      {
        name: "Clinical Significance",
        defaultExpanded: true,
        items: [
          { text: "Clinvar", slug: "clinvar", icon: "heart-pulse" },
          {
            text: "Somatic Mutation",
            slug: "somatic-mutation",
            icon: "target",
          },
        ],
      },
      {
        name: "Integrative Scores",
        defaultExpanded: true,
        items: [
          { text: "Integrative Score", slug: "integrative", icon: "brain" },
        ],
      },
      {
        name: "Conservation",
        defaultExpanded: true,
        items: [
          { text: "Conservation", slug: "conservation", icon: "history" },
        ],
      },
      {
        name: "Epigenetics",
        defaultExpanded: true,
        items: [
          { text: "Epigenetics", slug: "epigenetics", icon: "layers" },
          {
            text: "Chromatin State",
            slug: "chromatin-state",
            icon: "flask-conical",
          },
          {
            text: "Transcription Factors",
            slug: "transcription-factors",
            icon: "scan",
          },
        ],
      },
      {
        name: "Protein Function",
        defaultExpanded: true,
        items: [
          {
            text: "Protein Function",
            slug: "protein-function",
            icon: "activity",
          },
          { text: "SpliceAI", slug: "splice-ai", icon: "scissors" },
        ],
      },
      {
        name: "Phenotypic Effect",
        defaultExpanded: true,
        items: [
          { text: "GWAS Catalog", slug: "gwas-catalog", icon: "book-open" },
        ],
      },
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
    name: "Open Targets",
    slug: "open-targets",
    subCategories: [
      { text: "Consequences (VEP)", slug: "consequences" },
      { text: "Pathogenicity", slug: "variant-effects" },
      { text: "GWAS Fine-Mapping", slug: "credible-sets" },
      { text: "Locus-to-Gene", slug: "l2g-scores" },
      { text: "Disease Evidence", slug: "evidences" },
      { text: "Pharmacogenomics", slug: "pharmacogenomics" },
    ],
  },
  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];
