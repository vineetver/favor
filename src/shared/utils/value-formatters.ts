/**
 * Shared value formatting utilities used across different features
 * These utilities help with consistent formatting of data values in tables and components
 */

import type { ReactNode } from "react";

// Type guards for validation
export function isValidNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export function isValidString(value: any): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidArray(value: any): value is any[] {
  return Array.isArray(value) && value.length > 0;
}

// Number formatting utilities
export function roundNumber(value: number, decimals: number = 3): string {
  return Number(value.toFixed(decimals)).toString();
}

export function formatScientific(value: number, decimals: number = 2): string {
  return value.toExponential(decimals);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${roundNumber(value * 100, decimals)}%`;
}

// String utilities
export function splitText(text: string, separator: string = ";"): string[] {
  return text.split(separator).filter(item => item.trim().length > 0);
}

export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// Safe value conversion utilities
export function parseStringToNumber(value: string): number | null {
  if (!isValidString(value)) return null;
  const cleaned = value.trim();
  const parsed = parseFloat(cleaned);
  return isValidNumber(parsed) ? parsed : null;
}

export function parseStringToBoolean(value: string): boolean | null {
  if (!isValidString(value)) return null;
  const cleaned = value.trim().toLowerCase();
  if (cleaned === "true" || cleaned === "yes" || cleaned === "y" || cleaned === "1") return true;
  if (cleaned === "false" || cleaned === "no" || cleaned === "n" || cleaned === "0") return false;
  return null;
}

// Nested object accessors for complex data structures
export function safeNestedAccess<T>(
  obj: any,
  path: string,
  defaultValue: T | null = null
): T | null {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

// Constraint score accessors for gene data
export function getConstraintScore(
  gene: any,
  category: 'loeuf' | 'posterior' | 'shet' | 'damage' | 'gnomad',
  field: string
): any {
  return safeNestedAccess(gene, `constraint_scores.${category}.${field}`);
}

// Common data transformations
export function formatExternalId(id: string, prefix: string = ""): string {
  if (!isValidString(id)) return "";
  return prefix ? `${prefix}:${id}` : id;
}

export function formatGeneSymbol(symbol: string): string {
  if (!isValidString(symbol)) return "";
  return symbol.trim().toUpperCase();
}

export function formatChromosomeLocation(chr: string, start?: number, end?: number): string {
  if (!isValidString(chr)) return "";
  
  let location = chr.startsWith('chr') ? chr : `chr${chr}`;
  
  if (isValidNumber(start)) {
    location += `:${start.toLocaleString()}`;
    if (isValidNumber(end)) {
      location += `-${end.toLocaleString()}`;
    }
  }
  
  return location;
}