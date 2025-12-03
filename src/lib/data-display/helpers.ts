import { type ReactNode } from "react";

export const isValidNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value);
};

export const isValidString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const roundNumber = (num: number | null | undefined, decimals = 3): string => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return num.toFixed(decimals).replace(/\.?0+$/, "");
};

export const splitText = (text: string, separator: string): ReactNode => {
  if (!text) return null;
  return text.split(separator).join(", ");
};

export const safeCellRenderer = <T>(
  value: unknown,
  renderer: (val: T) => ReactNode,
  validator: (val: unknown) => val is T,
): ReactNode => {
  if (validator(value)) {
    return renderer(value);
  }
  return "-";
};
