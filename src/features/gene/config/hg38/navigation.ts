import type { GeneNavigationSection } from "@features/gene/types";

export const GENE_NAVIGATION_CONFIG: GeneNavigationSection[] = [
{
  name: "Gene Level Annotation",
  slug: "gene-level-annotation",
  subCategories: [
    { text: "LLM Summary", slug: "llm-summary" },
    { text: "Info and IDs", slug: "info-and-ids" },

    { text: "Function", slug: "function" },
    { text: "Expression", slug: "expression" },
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
      defaultExpanded: true,
      items: [
        { text: "LLM Summary", slug: "llm-summary", icon: "sparkles" },
        { text: "Info and IDs", slug: "info-and-ids", icon: "file-text" },
      ],
    },
    {
      name: "Gene Biology",
      defaultExpanded: true,
      items: [
        { text: "Function", slug: "function", icon: "dna" },
        { text: "Expression", slug: "expression", icon: "activity" },
        { text: "Protein-Protein Interactions", slug: "protein-protein-interactions", icon: "share-2" },
        { text: "Pathways", slug: "pathways", icon: "git-branch" },
      ],
    },
    {
      name: "Phenotypes",
      defaultExpanded: true,
      items: [
        { text: "Human Phenotype", slug: "human-phenotype", icon: "users" },
        { text: "Animal Phenotype", slug: "animal-phenotype", icon: "bug" },
      ],
    },
    {
      name: "Genetic Constraint",
      defaultExpanded: true,
      items: [
        { text: "Constraints and Haploinsufficiency", slug: "constraints-and-heplo", icon: "shield-alert" },
      ],
    },
    {
      name: "Graph Tools",
      defaultExpanded: true,
      items: [
        { text: "Graph Explorer", slug: "graph-explorer", icon: "network" },
        { text: "Interaction Neighborhood", slug: "interaction-neighborhood", icon: "share-2" },
        { text: "Pathway Leverage Map", slug: "pathway-leverage-map", icon: "git-branch" },
      ],
    },
  ],
},
  {
    name: "Disease & Therapeutics",
    slug: "disease-and-therapeutics",
    subCategories: [
      { text: "Evidence Command Center", slug: "evidence-command-center" },
      { text: "Disease Portfolio", slug: "disease-portfolio" },
      { text: "Phenotype Signature", slug: "phenotype-signature" },

      { text: "Drugs & Targeting", slug: "drugs-and-targeting" },
      { text: "Tractability & Target Class", slug: "tractability-and-target-class" },
      { text: "Chemical Probes", slug: "chemical-probes" },
      { text: "Safety Liabilities", slug: "safety-liabilities" },

      { text: "Cancer Hallmarks", slug: "cancer-hallmarks" },
      { text: "Target Enabling Package (TEP)", slug: "tep" },
    ],
    groups: [
      {
        name: "Evidence (OpenTargets-first)",
        defaultExpanded: true,
        items: [
          { text: "Evidence Command Center", slug: "evidence-command-center", icon: "badge-check" },
          { text: "Disease Portfolio", slug: "disease-portfolio", icon: "layers" },
          { text: "Phenotype Signature", slug: "phenotype-signature", icon: "layout-grid" },
        ],
      },
      {
        name: "Therapeutics",
        defaultExpanded: true,
        items: [
          { text: "Drugs & Targeting", slug: "drugs-and-targeting", icon: "pill" },
          { text: "Tractability & Target Class", slug: "tractability-and-target-class", icon: "radar" },
          { text: "Chemical Probes", slug: "chemical-probes", icon: "flask-conical" },
        ],
      },
      {
        name: "Safety & Risk",
        defaultExpanded: true,
        items: [{ text: "Safety Liabilities", slug: "safety-liabilities", icon: "alert-triangle" }],
      },
      {
        name: "Oncology Context",
        defaultExpanded: true,
        items: [
          { text: "Cancer Hallmarks", slug: "cancer-hallmarks", icon: "flame" },
          { text: "Target Enabling Package (TEP)", slug: "tep", icon: "package" },
        ],
      },
    ],
  },

  {
    name: "Variant Rollups",
    slug: "variant-rollups",
    subCategories: [
      // SNV rollups
      { text: "SNV: Allele Distribution", slug: "snv-allele-distribution" },
      { text: "SNV: Gencode Comprehensive Category", slug: "snv-genecode-comprehensive-category" },
      { text: "SNV: Functional Consequences", slug: "snv-functional-consequences" },
      { text: "SNV: Clinvar Clinical Significance", slug: "snv-clinvar" },
      { text: "SNV: High Integrative Score ( >= 10)", slug: "snv-high-integrative-score" },

      // InDel rollups
      { text: "InDel: Allele Distribution", slug: "indel-allele-distribution" },
      { text: "InDel: Genecode Comprehensive Category", slug: "indel-genecode-comprehensive-category" },
      { text: "InDel: Functional Consequences", slug: "indel-functional-consequences" },
      { text: "InDel: Clinvar Clinical Significance", slug: "indel-clinvar" },
    ],
    groups: [
      {
        name: "SNV Distribution & Annotation",
        defaultExpanded: true,
        items: [
          { text: "Allele Distribution", slug: "snv-allele-distribution", icon: "pie-chart" },
          { text: "Gencode Comprehensive Category", slug: "snv-genecode-comprehensive-category", icon: "layers" },
          { text: "Functional Consequences", slug: "snv-functional-consequences", icon: "git-branch" },
        ],
      },
      {
        name: "SNV Clinical & Prioritization",
        defaultExpanded: true,
        items: [
          { text: "Clinvar Clinical Significance", slug: "snv-clinvar", icon: "heart-pulse" },
          { text: "High Integrative Score ( >= 10)", slug: "snv-high-integrative-score", icon: "brain" },
        ],
      },
      {
        name: "InDel Distribution & Annotation",
        defaultExpanded: true,
        items: [
          { text: "Allele Distribution", slug: "indel-allele-distribution", icon: "pie-chart" },
          { text: "Genecode Comprehensive Category", slug: "indel-genecode-comprehensive-category", icon: "layers" },
          { text: "Functional Consequences", slug: "indel-functional-consequences", icon: "git-branch" },
        ],
      },
      {
        name: "InDel Clinical",
        defaultExpanded: true,
        items: [{ text: "Clinvar Clinical Significance", slug: "indel-clinvar", icon: "heart-pulse" }],
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
        name: "Cell & Tissue Atlases",
        defaultExpanded: true,
        items: [
          { text: "CATlas", slug: "catlas", icon: "layers" },
          { text: "ENTEx", slug: "entex", icon: "book-open" },
          { text: "SCENT", slug: "scent", icon: "scan" },
        ],
      },
      {
        name: "Epigenomics & Chromatin",
        defaultExpanded: true,
        items: [{ text: "Epimap", slug: "epimap", icon: "map" }],
      },
      {
        name: "Variant-to-Function Models",
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
        name: "Somatic & Cancer",
        defaultExpanded: true,
        items: [{ text: "Somatic Mutation", slug: "cosmic", icon: "target" }],
      },
    ],
  },

  {
    name: "Genome Browser",
    slug: "genome-browser",
    subCategories: [],
  },
];