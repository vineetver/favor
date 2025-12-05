/**
 * Reusable string parsing utilities for variant data
 * These functions handle common parsing patterns for genomic annotation data
 */

/**
 * Parse disease names separated by pipes or commas
 * Replaces underscores with spaces for better readability
 *
 * @example
 * parseDiseaseNames("Disease_A|Disease_B,Disease_C")
 * // Returns: ["Disease A", "Disease B", "Disease C"]
 *
 * @param value - Raw disease name string with separators
 * @returns Array of cleaned disease names
 */
export function parseDiseaseNames(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((d) => d.trim().replace(/_/g, " "))
    .filter((d) => d);
}

/**
 * Parse database:ID pairs separated by commas or spaces before capitals
 * Handles formats like "OMIM:123456 MedGen:C0001" or "OMIM:123456,MedGen:C0001"
 *
 * @example
 * parseDatabaseEntries("OMIM:123456 MedGen:C0001")
 * // Returns: [{database: "OMIM", id: "123456", raw: "OMIM:123456"}, ...]
 *
 * @param value - Raw database entry string
 * @returns Array of parsed database entries with database name, ID, and raw string
 */
export function parseDatabaseEntries(
  value: string | null,
): Array<{ database: string; id: string; raw: string }> {
  if (!value) return [];

  const entries = value
    .split(/,\s*|\s+(?=[A-Z])/)
    .map((entry) => entry.trim())
    .filter((entry) => entry);

  return entries.map((entry) => {
    const [database, id] = entry.split(":");
    return { database: database || "", id: id || "", raw: entry };
  });
}

/**
 * Parse ID:significance pairs separated by commas, pipes, or semicolons
 * Commonly used for ClinVar clinical significance data
 *
 * @example
 * parseClinicalSignificancePairs("12345:Pathogenic,67890:Benign")
 * // Returns: [{id: "12345", significance: "Pathogenic", raw: "12345:Pathogenic"}, ...]
 *
 * @param value - Raw clinical significance pairs string
 * @returns Array of parsed pairs with ID, significance, and raw string
 */
export function parseClinicalSignificancePairs(
  value: string | null,
): Array<{ id: string; significance: string; raw: string }> {
  if (!value) return [];

  const pairs = value
    .split(/[,|;]/)
    .map((pair) => pair.trim())
    .filter((pair) => pair);

  return pairs.map((pair) => {
    const [id, significance] = pair.split(":").map((s) => s.trim());
    return { id: id || "", significance: significance || "", raw: pair };
  });
}
