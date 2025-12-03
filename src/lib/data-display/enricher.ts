import type { ReactNode } from "react";
import type { GroupConfig } from "./builder";

export interface EnrichedCell {
  key: string;
  header: string;
  value: ReactNode;
  description?: ReactNode;
  category?: string;
  subcategory?: string;
  order?: number;
  isValid?: boolean;
}

export interface EnrichedGroup {
  id: string;
  title: string;
  slug: string;
  cells: EnrichedCell[];
}

/**
 * Check if a value is considered empty (null, undefined, empty string, or NaN)
 */
function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value === "number" && isNaN(value))
  );
}

/**
 * Enriches raw data using the provided column configuration.
 * Returns a structured array of groups with rendered cell values.
 */
export function enrichData<TData>(
  data: TData,
  config: GroupConfig<TData>[],
): EnrichedGroup[] {
  if (!data) return [];

  return config.map((group) => {
    const cells = group.columns
      .filter((col) => !col.showWhen || col.showWhen(data))
      .map((col) => {
        const rawValue = data[col.accessorKey];

        // Create the context for the renderer
        const context = {
          value: rawValue,
          row: data,
        };

        // Render the value using the cell renderer if present, otherwise just stringify
        // Don't convert empty values to "-" - let them remain empty for filtering
        const renderedValue = col.cell
          ? col.cell(context)
          : isEmpty(rawValue)
            ? null
            : String(rawValue);

        const isValid = col.validate ? col.validate(rawValue) : true;

        return {
          key: col.key,
          header: col.header,
          value: renderedValue,
          description: col.description,
          category: col.category,
          subcategory: col.subcategory,
          order: col.order,
          isValid,
          shouldHide: col.hideEmpty !== false && isEmpty(rawValue), // Hide by default unless explicitly set to false
        };
      })
      .filter((cell: any) => !cell.shouldHide); // Filter out cells that should be hidden

    return {
      id: group.id,
      title: group.title,
      slug: group.slug,
      cells,
    };
  });
}

/**
 * Enriches an array of data items.
 */
export function enrichDataset<TData>(
  dataset: TData[],
  config: GroupConfig<TData>[],
): EnrichedGroup[][] {
  if (!dataset) return [];
  return dataset.map((item) => enrichData(item, config));
}
