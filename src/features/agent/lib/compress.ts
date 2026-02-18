/**
 * Shared compression helpers for agent tools.
 * Each tool applies domain-specific compression; these are the common utilities.
 */

/** Truncate a string to maxLen, appending "…" if truncated. */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

/** Cap an array at maxItems, returning a tuple of [items, totalCount]. */
export function capArray<T>(
  arr: T[],
  maxItems: number,
): { items: T[]; total: number; capped: boolean } {
  return {
    items: arr.slice(0, maxItems),
    total: arr.length,
    capped: arr.length > maxItems,
  };
}

/** Pick only non-null/undefined values from an object. */
export function compactObject<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value != null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/** Truncate each section of a multi-section text to maxChars per section. */
export function truncateSections(
  text: string,
  maxCharsPerSection: number,
): string {
  const sections = text.split("\n\n");
  return sections
    .map((section) => truncate(section, maxCharsPerSection))
    .join("\n\n");
}
