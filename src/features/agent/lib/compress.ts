/**
 * Shared compression helpers for agent tools.
 * Each tool applies domain-specific compression; these are the common utilities.
 */

/** Truncate a string to maxLen, appending "…" if truncated. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
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
