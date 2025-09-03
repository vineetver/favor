import { variantDetailedColumns } from "./detailed";
import { variantSummaryColumns } from "./summary";
import type { VariantColumnsType } from "@/lib/annotations/types";

export type ColumnCategory =
  | "summary"
  | "global-annotation";

export function getHg19VariantColumns(
  parent: string,
  subCategorySlug: string,
): VariantColumnsType | null {
  if (!parent || !subCategorySlug) {
    return null;
  }

  switch (parent as ColumnCategory) {
    case "summary": {
      const found = variantSummaryColumns.find(
        (subCategory) => subCategory.slug === subCategorySlug,
      );
      return found || null;
    }
    case "global-annotation": {
      const found = variantDetailedColumns.find(
        (subCategory) => subCategory.slug === subCategorySlug,
      );
      return found || null;
    }
    default:
      return null;
  }
}