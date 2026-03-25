export interface RegionNavigationSection {
  name: string;
  slug: string;
  subCategories: { text: string; slug: string }[];
  groups: { name: string; items: { text: string; slug: string }[] }[];
}

export const REGION_NAVIGATION_CONFIG: RegionNavigationSection[] = [
  {
    name: "Regulatory",
    slug: "regulatory",
    subCategories: [
      { text: "Overview", slug: "overview" },
      { text: "Tissue Signals", slug: "tissue-signals" },
      { text: "Chromatin States", slug: "chromatin-states" },
      { text: "Enhancer-Genes", slug: "enhancer-genes" },
      { text: "Accessibility", slug: "accessibility" },
      { text: "Loops", slug: "loops" },
      { text: "Allele-Specific", slug: "allele-specific" },
      { text: "Validated Enhancers", slug: "validated-enhancers" },
      { text: "cCRE Links", slug: "ccre-links" },
      { text: "QTLs", slug: "qtls" },
      { text: "ChromBPNet", slug: "chrombpnet" },
      { text: "V2F Scores", slug: "tissue-scores" },
      { text: "Perturbation", slug: "perturbation" },
      { text: "AlphaGenome", slug: "alphagenome" },
    ],
    groups: [
      {
        name: "Overview",
        items: [{ text: "Evidence Summary", slug: "overview" }],
      },
      {
        name: "Epigenomic Signals",
        items: [
          { text: "Tissue Signals", slug: "tissue-signals" },
          { text: "Chromatin States", slug: "chromatin-states" },
          { text: "Accessibility", slug: "accessibility" },
        ],
      },
      {
        name: "Regulatory Links",
        items: [
          { text: "Enhancer-Genes", slug: "enhancer-genes" },
          { text: "cCRE Links", slug: "ccre-links" },
        ],
      },
      {
        name: "Chromatin Architecture",
        items: [
          { text: "Loops", slug: "loops" },
          { text: "Allele-Specific", slug: "allele-specific" },
        ],
      },
      {
        name: "Variant Effects",
        items: [
          { text: "QTLs", slug: "qtls" },
          { text: "ChromBPNet", slug: "chrombpnet" },
          { text: "V2F Scores", slug: "tissue-scores" },
        ],
      },
      {
        name: "Perturbation",
        items: [{ text: "Perturbation", slug: "perturbation" }],
      },
      {
        name: "AI Predictions",
        items: [{ text: "AlphaGenome", slug: "alphagenome" }],
      },
      {
        name: "Validation",
        items: [{ text: "Validated Enhancers", slug: "validated-enhancers" }],
      },
    ],
  },

  {
    name: "Variants",
    slug: "variants",
    subCategories: [
      { text: "Summary Statistics", slug: "summary-statistics" },
      { text: "Variant Explorer", slug: "variant-explorer" },
    ],
    groups: [
      {
        name: "Overview",
        items: [{ text: "Summary Statistics", slug: "summary-statistics" }],
      },
      {
        name: "Explore",
        items: [{ text: "Variant Explorer", slug: "variant-explorer" }],
      },
    ],
  },

  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
    groups: [],
  },
];
