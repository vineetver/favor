import { variantDetailedColumns } from "@/lib/variant/columns/detailed";
import { variantSingleCellColumns } from "@/lib/variant/columns/single-cell";
import { variantSummaryColumns } from "@/lib/variant/columns/summary";
import type { VariantColumnsType } from "@/lib/annotations/types";

export type ColumnCategory =
  | "summary"
  | "global-annotation"
  | "single-cell-tissue";

export function getVariantColumns(
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
    case "single-cell-tissue": {
      const found = variantSingleCellColumns.find(
        (subCategory) => subCategory.slug === subCategorySlug,
      );
      return found || null;
    }
    default:
      return null;
  }
}