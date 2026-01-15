export interface VariantNavigationLink {
  text: string;
  slug: string;
}

export interface VariantNavigationSection {
  name: string;
  slug: string;
  subCategories: VariantNavigationLink[];
}
