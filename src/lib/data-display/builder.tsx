import type { ReactNode } from "react";
import type { CellRenderer } from "./formatters";
import { formatters } from "./formatters";

// --- Configuration Types ---

export interface ColumnConfig<TData, TValue = any> {
    key: string; // Unique key for the column
    accessorKey: keyof TData; // The key in the data object
    header: string;
    description?: ReactNode; // Tooltip
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
}

export interface GroupConfig<TData> {
    id: string;
    title: string;
    slug: string;
    columns: ColumnConfig<TData>[];
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
        }
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
        };
    }

    /**
     * Create a group of columns
     */
    group(
        id: string,
        title: string,
        columns: ColumnConfig<TData>[]
    ): GroupConfig<TData> {
        return {
            id,
            title,
            slug: id.toLowerCase().replace(/\s+/g, "-"),
            columns
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
