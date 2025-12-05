import React, { type ReactNode } from "react";
import { ExternalLink } from "@/components/ui/external-link";
import { cn } from "@/lib/utils";
import { BADGE_COLORS } from "./color-system";

// --- Types ---

export type CellContext<TValue, TData> = {
  value: TValue;
  row: TData;
};

export type CellRenderer<TValue, TData> = (
  context: CellContext<TValue, TData>,
) => ReactNode;

// --- Formatters ---

import { roundNumber } from "@/lib/data-display/helpers";

export const formatters = {
  // Basic Text
  text:
    <TData, TValue = unknown>(): CellRenderer<TValue, TData> =>
      ({ value }) => {
        if (value === null || value === undefined) return "-";
        return String(value);
      },

  // ... (existing imports)

  // ...

  // Numbers
  decimal:
    <TData,>(
      decimals = 3,
      keepZeros = false,
    ): CellRenderer<number | string | null | undefined, TData> =>
      ({ value }) => {
        if (value === null || value === undefined) return "-";
        const num = typeof value === "string" ? parseFloat(value) : value;
        return roundNumber(num, decimals, keepZeros);
      },

  scientific:
    <TData,>(
      decimals = 2,
    ): CellRenderer<number | string | null | undefined, TData> =>
      ({ value }) => {
        if (value === null || value === undefined) return "-";
        const num = typeof value === "string" ? parseFloat(value) : value;
        if (isNaN(num)) return "-";
        return num.toExponential(decimals);
      },

  // Badges / Colored Text
  badge:
    <TData,>(
      colorMap: Record<string, string> | Array<[string | RegExp, string]>,
      fallbackColor = "gray",
      labelMap?: Record<string, string> | ((value: string) => string),
      emptyValue?: string,
    ): CellRenderer<string | null | undefined, TData> =>
      ({ value }) => {
        let displayValue = value;
        if (!displayValue) {
          if (emptyValue) {
            displayValue = emptyValue;
          } else {
            return "-";
          }
        }

        let colorKey: string;

        if (Array.isArray(colorMap)) {
          // Pattern matching mode: iterate through patterns and find first match
          const match = colorMap.find(([pattern]) => {
            if (pattern instanceof RegExp) {
              return pattern.test(displayValue);
            }
            return displayValue === pattern;
          });
          colorKey = match?.[1] || fallbackColor;
        } else {
          // Exact match mode (backward compatible)
          colorKey =
            colorMap[displayValue] || colorMap["default"] || fallbackColor;
        }

        const className = BADGE_COLORS[colorKey] || BADGE_COLORS.gray;

        let displayText = displayValue;
        if (labelMap) {
          if (typeof labelMap === "function") {
            displayText = labelMap(displayValue);
          } else {
            displayText = labelMap[displayValue] || displayValue;
          }
        }

        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1.5 rounded-full font-medium transition-colors capitalize",
              className,
            )}
          >
            {displayText.replace(/_/g, " ")}
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
    ): CellRenderer<TValue | null | undefined, TData> =>
      ({ value, row }) => {
        if (value === null || value === undefined) return "-";
        return renderer(value as TValue, row);
      },
};
