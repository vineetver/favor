export interface SubCategory {
  text: string;
  slug: string;
}

export interface NavigationCategory {
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

export const HG19_REGION_NAVIGATION: NavigationCategory[] = [
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
        text: "High Integrative Score",
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
    name: "Full Tables",
    slug: "full-tables",
    subCategories: [
      { text: "SNV Table", slug: "SNV-table" },
      { text: "InDel Table", slug: "InDel-table" },
    ],
  },
];

export function getHG19RegionCategoryBySlug(slug: string): NavigationCategory | undefined {
  return HG19_REGION_NAVIGATION.find(category => category.slug === slug);
}

export function getHG19RegionSubCategoryBySlug(categorySlug: string, subCategorySlug: string): SubCategory | undefined {
  const category = getHG19RegionCategoryBySlug(categorySlug);
  return category?.subCategories.find(sub => sub.slug === subCategorySlug);
}