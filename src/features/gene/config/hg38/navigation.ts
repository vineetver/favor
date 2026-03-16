import type { GeneNavigationSection } from "@features/gene/types";

export const GENE_NAVIGATION_CONFIG: GeneNavigationSection[] = [
{
  name: "Gene Annotation",
  slug: "gene-level-annotation",
  subCategories: [
    { text: "LLM Summary", slug: "llm-summary" },
    { text: "Info and IDs", slug: "info-and-ids" },

    { text: "Function", slug: "function" },
    { text: "Expression", slug: "expression" },
    { text: "Protein Structure", slug: "protein-structure" },
    { text: "Protein-Protein Interactions", slug: "protein-protein-interactions" },
    { text: "Pathways", slug: "pathways" },

    { text: "Human Phenotype", slug: "human-phenotype" },
    { text: "Animal Phenotype", slug: "animal-phenotype" },

    { text: "Constraints and Haploinsufficiency", slug: "constraints-and-heplo" },

    { text: "Graph Explorer", slug: "graph-explorer" },
    { text: "Interaction Neighborhood", slug: "interaction-neighborhood" },
    { text: "Pathway Leverage Map", slug: "pathway-leverage-map" },
  ],
  groups: [
    {
      name: "Overview",
      items: [
        { text: "LLM Summary", slug: "llm-summary", icon: "sparkles" },
        { text: "Info and IDs", slug: "info-and-ids", icon: "file-text" },
      ],
    },
    {
      name: "Biology",
      items: [
        { text: "Function", slug: "function", icon: "dna" },
        { text: "Expression", slug: "expression", icon: "activity" },
        { text: "Protein Structure", slug: "protein-structure", icon: "box" },
        { text: "Constraints and Haploinsufficiency", slug: "constraints-and-heplo", icon: "shield-alert" },
      ],
    },
    {
      name: "Phenotypes",
      items: [
        { text: "Human Phenotype", slug: "human-phenotype", icon: "users" },
        { text: "Animal Phenotype", slug: "animal-phenotype", icon: "bug" },
      ],
    },
    {
      name: "Graph Tools",
      items: [
        { text: "Graph Explorer", slug: "graph-explorer", icon: "network" },
        { text: "Interaction Neighborhood", slug: "interaction-neighborhood", icon: "share-2" },
        { text: "Pathways", slug: "pathway-leverage-map", icon: "git-branch" },
      ],
    },
  ],
},
  {
    name: "Disease & Therapeutics",
    slug: "disease-and-therapeutics",
    subCategories: [
      { text: "Disease Portfolio", slug: "disease-portfolio" },
      { text: "Tractability & Target Class", slug: "tractability-and-target-class" },
      { text: "Chemical Probes", slug: "chemical-probes" },
      { text: "Safety Liabilities", slug: "safety-liabilities" },
      { text: "Cancer Hallmarks", slug: "cancer-hallmarks" },
    ],
    groups: [
      {
        name: "Evidence",
        items: [
          { text: "Disease Portfolio", slug: "disease-portfolio", icon: "layers" },
          { text: "Phenotype Signature", slug: "phenotype-signature", icon: "layout-grid" },
        ],
      },
      {
        name: "Therapeutic Readiness",
        items: [
          { text: "Tractability & Target Class", slug: "tractability-and-target-class", icon: "radar" },
          { text: "Chemical Probes", slug: "chemical-probes", icon: "flask-conical" },
          { text: "Target Enabling Package (TEP)", slug: "tep", icon: "package" },
        ],
      },
      {
        name: "Safety & Risk",
        items: [{ text: "Safety Liabilities", slug: "safety-liabilities", icon: "alert-triangle" }],
      },
      {
        name: "Oncology Context",
        items: [
          { text: "Cancer Hallmarks", slug: "cancer-hallmarks", icon: "flame" },
        ],
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
        items: [
          { text: "Summary Statistics", slug: "summary-statistics", icon: "bar-chart-2" },
        ],
      },
      {
        name: "Explore",
        items: [
          { text: "Variant Explorer", slug: "variant-explorer", icon: "table-2" },
        ],
      },
    ],
  },

  {
    name: "Cell/Tissue",
    slug: "tissue-specific",
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
    ],
    showIcons: false,
    groups: [
      {
        name: "Overview",
        items: [
          { text: "Evidence Summary", slug: "overview" },
        ],
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
        name: "Validation",
        items: [
          { text: "Validated Enhancers", slug: "validated-enhancers" },
        ],
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