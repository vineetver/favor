import { variantDetailedColumns } from "@/lib/variant/columns/detailed";
import { variantSingleCellColumns } from "@/lib/variant/columns/single-cell";
import { variantSummaryColumns } from "@/lib/variant/columns/summary";
import { getHg19VariantColumns } from "@/lib/hg19/variant/columns";
import type { VariantColumnsType } from "@/lib/annotations/types";
import type { GenomicBuild } from "@/lib/stores/search-store";

export type ColumnCategory =
  | "summary"
  | "global-annotation"
  | "single-cell-tissue";

export function getVariantColumns(
  parent: string,
  subCategorySlug: string,
  genomeBuild: GenomicBuild = "hg38",
): VariantColumnsType | null {
  if (!parent || !subCategorySlug) {
    return null;
  }

  // Use HG19-specific columns for HG19 build
  if (genomeBuild === "hg19") {
    return getHg19VariantColumns(parent, subCategorySlug);
  }

  // Default HG38 behavior
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
