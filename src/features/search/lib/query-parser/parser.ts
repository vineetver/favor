import { PATTERNS } from "./patterns";
import type { SearchInputType, ParsedQuery } from "./types";

function normalizeInput(input: string): string {
  let normalized = input.trim();

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, "");

  // Remove chr prefix from variants/regions for consistency
  // chr19-392932-A-T -> 19-392932-A-T
  if (normalized.match(/^chr\d/i)) {
    normalized = normalized.replace(/^chr/i, "");
  }

  return normalized;
}

export function detectQueryType(input: string): SearchInputType {
  const trimmed = normalizeInput(input);

  if (!trimmed) return "unknown";

  if (PATTERNS.RSID.test(trimmed)) return "rsid";

  if (PATTERNS.VARIANT_VCF.test(trimmed)) return "variant";

  if (PATTERNS.REGION.test(trimmed)) return "region";

  if (
    PATTERNS.GENE.test(trimmed) &&
    !trimmed.startsWith("rs") &&
    trimmed.length >= 2
  ) {
    return "gene";
  }

  return "unknown";
}

export function parseQuery(input: string): ParsedQuery {
  const trimmed = input.trim();
  const cleaned = normalizeInput(input);
  const type = detectQueryType(cleaned);

  let normalized = cleaned.toLowerCase();
  let formatted = cleaned;

  switch (type) {
    case "rsid":
      normalized = cleaned.toLowerCase();
      formatted = cleaned.toLowerCase();
      break;
    case "gene":
      normalized = cleaned.toLowerCase();
      formatted = cleaned.toUpperCase();
      break;
    case "variant":
    case "region": {
      // Ensure consistent formatting: remove chr prefix, uppercase nucleotides
      const parts = cleaned.split("-");
      if (parts.length === 4) {
        // Variant: chr-pos-ref-alt
        const [chr, pos, ref, alt] = parts;
        formatted = `${chr}-${pos}-${ref.toUpperCase()}-${alt.toUpperCase()}`;
        normalized = formatted.toLowerCase();
      } else if (parts.length === 3) {
        // Region: chr-start-end
        formatted = cleaned;
        normalized = cleaned.toLowerCase();
      } else {
        formatted = cleaned;
        normalized = cleaned.toLowerCase();
      }
      break;
    }
    default:
      if (PATTERNS.RSID.test(cleaned)) {
        formatted = cleaned.toLowerCase();
      } else if (
        PATTERNS.GENE.test(cleaned) &&
        !cleaned.includes("-") &&
        !cleaned.startsWith("rs")
      ) {
        formatted = cleaned.toUpperCase();
      }
  }

  return {
    raw: input,
    trimmed: cleaned,
    type,
    normalized,
    formatted,
  };
}

export function shouldShowSuggestions(parsed: ParsedQuery): boolean {
  const { type, trimmed } = parsed;

  if (type === "gene" || type === "rsid") {
    return true;
  }

  if (
    type === "unknown" &&
    trimmed.length >= 2 &&
    !trimmed.includes("-") &&
    !PATTERNS.CHR_PREFIX.test(trimmed) &&
    !/^\d+$/.test(trimmed)
  ) {
    return true;
  }

  return false;
}
