export { type SubCategory, type NavigationCategory } from "@/lib/gene/navigation";
import { GENE_NAVIGATION } from "@/lib/gene/navigation";

export const REGION_NAVIGATION = GENE_NAVIGATION.filter(
  (category) => category.slug !== "gene-level-annotation"
);