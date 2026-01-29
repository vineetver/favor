import type { Gene } from "@features/gene/types";
import type { Variant } from "@features/variant/types";
import { CategoryDetailViewClient } from "./category-detail-view-client";

export type ColumnGroupSource = "gene" | "variant";

interface CategoryDetailViewProps {
  data: Gene | Variant;
  categoryId: string;
  columnGroupSource: ColumnGroupSource;
  className?: string;
}

/**
 * Generic category detail view component for displaying entity data in a card layout
 * Works with any entity type (Variant, Gene, etc.)
 */
export function CategoryDetailView({
  data,
  categoryId,
  columnGroupSource,
  className = "",
}: CategoryDetailViewProps) {
  return (
    <CategoryDetailViewClient
      data={data}
      categoryId={categoryId}
      columnGroupSource={columnGroupSource}
      className={className}
    />
  );
}
