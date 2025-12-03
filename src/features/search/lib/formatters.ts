import { parseQuery } from "./query-parser/parser";

export function formatForDisplay(input: string): string {
  const parsed = parseQuery(input);
  return parsed.formatted;
}

export function formatForApi(input: string): string {
  const parsed = parseQuery(input);
  return parsed.normalized;
}

export function getPlaceholderText(): string {
  return "Search for genes, variants, or regions";
}
