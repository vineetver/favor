export {
  type SubCategory,
  type NavigationCategory,
} from "@/lib/gene/navigation";
import { GENE_NAVIGATION } from "@/lib/gene/navigation";

export const REGION_NAVIGATION = GENE_NAVIGATION.filter(
  (category) => category.slug !== "gene-level-annotation",
).map((category) => {
  // Remove pgBoost from tissue-specific subcategories since it's only available for genes
  if (category.slug === "tissue-specific") {
    return {
      ...category,
      subCategories: category.subCategories.filter(
        (subCategory) => subCategory.slug !== "pgboost",
      ),
    };
  }
  return category;
});
