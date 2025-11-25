export interface SubCategory {
  text: string;
  slug: string;
}

export interface NavigationCategory {
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

export const HG19_VARIANT_NAVIGATION: NavigationCategory[] = [
  {
    name: "Global Annotation",
    slug: "global-annotation",
    subCategories: [
      { text: "Variant Summary", slug: "llm-summary" },
      { text: "Basic Information", slug: "basic" },
      { text: "Category", slug: "category" },
      { text: "Clinvar", slug: "clinvar" },
      { text: "Ancestry Specific AF", slug: "ancestry-af" },
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
    ],
  },
];
