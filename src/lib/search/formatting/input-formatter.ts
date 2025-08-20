export type QueryType = "variant" | "rsid" | "gene" | "region";

export type SearchInputType = QueryType | "unknown";

export interface InputFormatResult {
  formattedValue: string;
  detectedType: SearchInputType;
  shouldShowSuggestions: boolean;
}

/**
 * Detects the type of search input based on patterns
 */
export function detectInputType(input: string): SearchInputType {
  const trimmed = input.trim();

  if (!trimmed) return "unknown";

  // rsID pattern (rs followed by numbers)
  if (/^rs\d+$/i.test(trimmed)) return "rsid";

  // Variant VCF format (chromosome-position-ref-alt)
  if (/^(chr)?\d{1,2}|X|Y|MT?-\d+-[ATCG]+-[ATCG]+$/i.test(trimmed))
    return "variant";

  // Region format (chromosome-startPosition-endPosition)
  if (/^(chr)?\d{1,2}|X|Y|MT?-\d+-\d+$/i.test(trimmed)) return "region";

  // Gene name pattern (letters, numbers, hyphens, but not starting with rs or containing -)
  if (
    /^[A-Z][A-Z0-9-]*$/i.test(trimmed) &&
    !trimmed.startsWith("rs") &&
    trimmed.length >= 2
  ) {
    return "gene";
  }

  return "unknown";
}

/**
 * Formats input based on detected type with proper case normalization
 */
export function formatSearchInput(input: string): InputFormatResult {
  const detectedType = detectInputType(input);
  let formattedValue = input;

  switch (detectedType) {
    case "rsid":
      // Auto-lowercase rsIDs (RS7412 -> rs7412)
      formattedValue = input.toLowerCase();
      break;
    case "gene":
      // Auto-uppercase gene names (apoe -> APOE)
      formattedValue = input.toUpperCase();
      break;
    case "variant":
    case "region":
      formattedValue = input;
      break;
    default:
      // For partial/incomplete inputs, apply smart formatting
      if (input.match(/^RS\d+$/i)) {
        formattedValue = input.toLowerCase();
      } else if (
        input.match(/^[a-z][a-z0-9-]*$/i) &&
        !input.includes("-") &&
        !input.startsWith("rs") &&
        !input.match(/^\d/) &&
        input.length >= 2
      ) {
        formattedValue = input.toUpperCase();
      }
      break;
  }

  // Only show suggestions for genes and rsIDs
  const shouldShowSuggestions =
    detectedType === "gene" ||
    detectedType === "rsid" ||
    (detectedType === "unknown" &&
      input.length >= 2 &&
      !input.includes("-") &&
      !input.match(/^\d+$/) &&
      !input.match(/^chr/i));

  return {
    formattedValue,
    detectedType,
    shouldShowSuggestions,
  };
}

/**
 * Gets appropriate placeholder text based on input
 */
export function getPlaceholderText(): string {
  return "Search for genes, variants, or regions";
}

/**
 * Normalizes input for API queries (case-insensitive search)
 */
export function normalizeForApi(input: string): string {
  return input.trim().toLowerCase();
}
