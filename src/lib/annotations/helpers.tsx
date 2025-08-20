import type { JSX } from "react";
import type {
  CellValue,
  ColumnsType,
  FilteredItem,
} from "@/lib/annotations/types";
import {
  validateColumnConfig,
  validateVariantData,
} from "@/lib/annotations/validation";

const FALSY_VALUES = [null, undefined, "", "NA", " ", "N/A"] as const;

const DECIMAL_PLACES = {
  PRECISION: 6,
  PERCENTILE: 1,
  PROPORTION: 4,
} as const;

const PERCENTILE_CALCULATION = {
  BASE: 10,
  MULTIPLIER: -0.1,
  PERCENTAGE: 100,
} as const;

export function isValidNumber(value: unknown): value is number {
  return (
    typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value)
  );
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function safeCellRenderer<T>(
  value: CellValue,
  renderer: (safeValue: T) => JSX.Element | undefined,
  typeGuard: (value: unknown) => value is T,
): JSX.Element | undefined {
  if (!typeGuard(value)) {
    return undefined;
  }
  try {
    return renderer(value);
  } catch (error) {
    console.warn("Cell renderer failed:", error);
    return undefined;
  }
}

export function safeGetProperty(
  obj: Record<string, unknown>,
  key: string,
): CellValue {
  const value = obj[key];
  if (FALSY_VALUES.includes(value as (typeof FALSY_VALUES)[number])) {
    return undefined;
  }
  return value as CellValue;
}

export const annotationMap: {
  [key: string]: string;
} = {
  PLS: "Promoter",
  pELS: "Proximal enhancer",
  dELS: "Distal enhancer",
  "CA-CTCF": "Chromatin Accessible with CTCF",
  "CA-H3K4me3": "Chromatin Accessible with H3K4me3",
  "CA-TF": "Chromatin Accessible with TF",
  CA: "Chromatin Accessible Only",
  TF: "TF Only",
};

export function roundNumber(value: number): number {
  if (!isValidNumber(value)) {
    return 0;
  }
  return Number(value.toFixed(DECIMAL_PLACES.PRECISION));
}

export function safeRound(value: unknown): JSX.Element | undefined {
  return safeCellRenderer(
    value as CellValue,
    (num) => <span>{roundNumber(num)}</span>,
    isValidNumber,
  );
}

export function cleanText(input: unknown): string {
  if (!isValidString(input)) {
    return "";
  }

  try {
    let cleaned = input.replace(/^FUNCTION:\s*/i, "");
    cleaned = cleaned.trim().replace(/\s+/g, " ");

    if (cleaned.length === 0) {
      return "";
    }

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    cleaned = cleaned.replace(/;$/, "");

    return cleaned;
  } catch (error) {
    console.warn("cleanText failed:", error);
    return String(input || "");
  }
}

export function splitText(
  input: CellValue,
  separator: string,
): JSX.Element | undefined {
  if (!isValidString(input) || !isValidString(separator)) {
    return undefined;
  }

  try {
    const uniqueItems = Array.from(new Set(input.split(separator)))
      .filter((item) => item.trim() !== "")
      .map((item) => item.trim());

    if (uniqueItems.length === 0) {
      return undefined;
    }

    return (
      <ul>
        {uniqueItems.map((item: string, index: number) => {
          const safeKey = `split-text-${index}-${item.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}`;
          return (
            <li key={safeKey} className="py-1 capitalize">
              {item}
            </li>
          );
        })}
      </ul>
    );
  } catch (error) {
    console.warn("splitText failed:", error);
    return undefined;
  }
}

export function getFilteredItems<T extends Record<string, unknown>>(
  columns: ColumnsType,
  data: T,
): FilteredItem[] | null {
  const columnValidation = validateColumnConfig(columns);
  if (!columnValidation.success) {
    console.warn("Column validation failed:", columnValidation.error);
    return null;
  }

  const dataValidation = validateVariantData(data);
  if (!dataValidation.success) {
    console.warn("Data validation failed:", dataValidation.error);
    return null;
  }

  const categoryItems = columnValidation.data.items;
  if (!categoryItems?.length) {
    return null;
  }

  const processedItems = categoryItems.reduce<FilteredItem[]>((acc, column) => {
    const rawValue = safeGetProperty(data, column.accessor);

    if (rawValue === undefined) {
      return acc;
    }

    let processedValue: CellValue | JSX.Element;
    if (column.Cell) {
      try {
        processedValue = column.Cell(rawValue);
        // If Cell function returns undefined, skip this item (it doesn't meet the threshold)
        if (processedValue === undefined) {
          return acc;
        }
      } catch (error) {
        console.warn(`Cell renderer failed for ${column.accessor}:`, error);
        processedValue = rawValue;
      }
    } else {
      processedValue = isValidNumber(rawValue)
        ? roundNumber(rawValue)
        : rawValue;
    }

    const numericValue = isValidNumber(rawValue) ? rawValue : 0;
    const totalValue =
      isValidNumber(data.total) && data.total !== 0 ? data.total : 1;

    const { Cell: _, ...columnWithoutCell } = column;
    acc.push({
      ...columnWithoutCell,
      value: processedValue,
      percentile:
        numericValue > 0
          ? (
              PERCENTILE_CALCULATION.BASE **
                (numericValue * PERCENTILE_CALCULATION.MULTIPLIER) *
              PERCENTILE_CALCULATION.PERCENTAGE
            ).toFixed(DECIMAL_PLACES.PERCENTILE)
          : "0.0",
      proportion: (numericValue / totalValue).toFixed(
        DECIMAL_PLACES.PROPORTION,
      ),
    });

    return acc;
  }, []);

  return processedItems.length > 0 ? processedItems : null;
}
