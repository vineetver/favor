export interface SubCategory {
  text: string;
  slug: string;
}

export interface NavigationCategory {
  name: string;
  slug: string;
  subCategories: SubCategory[];
}

export const HG19_GENE_NAVIGATION: NavigationCategory[] = [
  {
    name: "Gene Level Annotation",
    slug: "gene-level-annotation",
    subCategories: [
      { text: "Info and IDs", slug: "info-and-ids" },
      { text: "Function", slug: "function" },
      { text: "Human Phenotype", slug: "human-phenotype" },
      { text: "Animal Phenotype", slug: "animal-phenotype" },
      { text: "Expression", slug: "expression" },
      {
        text: "Protein-Protein Interactions",
        slug: "protein-protein-interactions",
      },
      { text: "Pathways", slug: "pathways" },
      {
        text: "Constraints and Haploinsufficiency",
        slug: "constraints-and-heplo",
      },
    ],
  },
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

// Helper function to get category by slug
export function getHG19CategoryBySlug(
  slug: string,
): NavigationCategory | undefined {
  return HG19_GENE_NAVIGATION.find((category) => category.slug === slug);
}

// Helper function to get subcategory by category and subcategory slug
export function getHG19SubCategoryBySlug(
  categorySlug: string,
  subCategorySlug: string,
): SubCategory | undefined {
  const category = getHG19CategoryBySlug(categorySlug);
  return category?.subCategories.find((sub) => sub.slug === subCategorySlug);
}
