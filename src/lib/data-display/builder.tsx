import type { ReactNode } from "react";
import type { CellRenderer } from "./formatters";
import { formatters } from "./formatters";

// --- Configuration Types ---

export interface ColumnConfig<TData, TValue = any> {
  key: string; // Unique key for the column
  accessorKey: keyof TData; // The key in the data object
  header: string;
  description?: ReactNode; // Tooltip - supports JSX
  cell?: CellRenderer<TValue, TData>;

  // Metadata for filtering/sorting
  enableSorting?: boolean;
  enableFiltering?: boolean;
  filterType?: "text" | "number" | "select";

  // Rich Metadata
  category?: string;
  subcategory?: string;
  order?: number;

  // Behavior
  showWhen?: (data: TData) => boolean;
  validate?: (value: unknown) => boolean;
  hideEmpty?: boolean; // If true (default), hide when value is null, undefined, or empty string
}

export interface GroupConfig<TData> {
  id: string;
  title: string;
  slug: string;
  columns: ColumnConfig<TData>[];
  meta?: any;
}

// --- Builder ---

export class ColumnBuilder<TData> {
  /**
   * Create a simple accessor column
   */
  accessor<K extends keyof TData>(
    key: K,
    options: {
      header: string;
      description?: ReactNode;
      cell?: CellRenderer<TData[K], TData>;
      enableSorting?: boolean;
      category?: string;
      subcategory?: string;
      order?: number;
      showWhen?: (data: TData) => boolean;
      validate?: (value: unknown) => boolean;
      hideEmpty?: boolean; // Default true - hide null, undefined, empty string
    },
  ): ColumnConfig<TData, TData[K]> {
    return {
      key: String(key),
      accessorKey: key,
      header: options.header,
      description: options.description,
      cell: options.cell || formatters.text(),
      enableSorting: options.enableSorting ?? true,
      category: options.category,
      subcategory: options.subcategory,
      order: options.order,
      showWhen: options.showWhen,
      validate: options.validate,
      hideEmpty: options.hideEmpty ?? true, // Default to true
    };
  }

  /**
   * Create a group of columns
   */
  group(
    id: string,
    title: string,
    columns: ColumnConfig<TData>[],
    meta?: any,
  ): GroupConfig<TData> {
    return {
      id,
      title,
      slug: id.toLowerCase().replace(/\s+/g, "-"),
      columns,
      meta,
    };
  }

  /**
   * Create a display-only column (no direct data mapping)
   */
  display(options: {
    id: string;
    header: string;
    description?: ReactNode;
    cell: CellRenderer<any, TData>;
    category?: string;
    subcategory?: string;
    order?: number;
    showWhen?: (data: TData) => boolean;
  }): ColumnConfig<TData, any> {
    return {
      key: options.id,
      accessorKey: options.id as keyof TData, // Dummy accessor
      header: options.header,
      description: options.description,
      cell: options.cell,
      enableSorting: false,
      category: options.category,
      subcategory: options.subcategory,
      order: options.order,
      showWhen: options.showWhen,
      hideEmpty: false, // Always show unless manually hidden via showWhen
    };
  }

  // Expose formatters for easy access
  format = formatters;
}

/**
 * Factory function to create a builder for a specific type
 */
export function createColumnHelper<TData>() {
  return new ColumnBuilder<TData>();
}
