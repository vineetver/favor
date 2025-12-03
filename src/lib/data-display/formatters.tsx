import React, { type ReactNode } from "react";
import { ExternalLink } from "@/components/ui/external-link";
import { cn } from "@/lib/utils";

// --- Types ---

export type CellContext<TValue, TData> = {
    value: TValue;
    row: TData;
};

export type CellRenderer<TValue, TData> = (
    context: CellContext<TValue, TData>,
) => ReactNode;

// --- Formatters ---

export const formatters = {
    // Basic Text
    text:
        <TData, TValue = unknown>(): CellRenderer<TValue, TData> =>
            ({ value }) => {
                if (value === null || value === undefined) return "-";
                return String(value);
            },

    // Numbers
    decimal:
        <TData,>(decimals = 3): CellRenderer<number | string | null | undefined, TData> =>
            ({ value }) => {
                if (value === null || value === undefined) return "-";
                const num = typeof value === "string" ? parseFloat(value) : value;
                if (isNaN(num)) return "-";
                // Remove trailing zeros after decimal point
                return num.toFixed(decimals).replace(/\.?0+$/, "");
            },

    scientific:
        <TData,>(decimals = 2): CellRenderer<number | string | null | undefined, TData> =>
            ({ value }) => {
                if (value === null || value === undefined) return "-";
                const num = typeof value === "string" ? parseFloat(value) : value;
                if (isNaN(num)) return "-";
                return num.toExponential(decimals);
            },

    // Badges / Colored Text
    badge:
        <TData,>(
            colorMap: Record<string, string>,
            fallbackColor = "gray",
        ): CellRenderer<string | null | undefined, TData> =>
            ({ value }) => {
                if (!value) return "-";
                const colorClass = colorMap[value] || colorMap["default"] || fallbackColor;

                return (
                    <span
                        className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                            // In a real app, use a lookup or safe-list.
                            // For now, we assume colorClass is a valid tailwind utility or we'd map it.
                            // Simplified: just passing the value as a class for demonstration if it was a full class
                            // But here we'll just use the color name in a style for safety if not using a preset map
                            `bg-${colorClass}-100 text-${colorClass}-800`,
                        )}
                    >
                        {value.replace(/_/g, " ")}
                    </span>
                );
            },

    // Links
    link:
        <TData, TValue>(
            urlBuilder: (value: TValue, row: TData) => string,
        ): CellRenderer<TValue, TData> =>
            ({ value, row }) => {
                if (value === null || value === undefined) return "-";
                return (
                    <ExternalLink href={urlBuilder(value, row)}>
                        {String(value)}
                    </ExternalLink>
                );
            },

    // Lists
    list:
        <TData,>(separator = ", "): CellRenderer<string | string[], TData> =>
            ({ value }) => {
                if (!value) return "-";
                if (Array.isArray(value)) return value.join(separator);
                return value.split(separator).join(", ");
            },

    // Custom
    custom:
        <TValue, TData>(
            renderer: (value: TValue, row: TData) => ReactNode,
        ): CellRenderer<TValue, TData> =>
            ({ value, row }) =>
                renderer(value, row),
};
