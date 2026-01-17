import { detectQueryType } from "./parser";
import {
  MAX_POSITION,
  MAX_REGION_SIZE,
  PATTERNS,
  VALID_CHROMOSOMES,
} from "./patterns";
import type { QueryType, QueryValidation } from "./types";

export function validateQuery(query: string): QueryValidation {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      isValid: false,
      type: null,
      error: "Please enter a search query",
    };
  }

  // Normalize the input (remove chr prefix, extra spaces, etc.)
  const normalized = trimmed.replace(/\s+/g, "").replace(/^chr/i, "");
  const type = detectQueryType(normalized);

  if (type === "unknown") {
    return {
      isValid: false,
      type: null,
      error: "Invalid search format. Please check your input.",
    };
  }

  switch (type) {
    case "rsid":
      return validateRsID(normalized);
    case "variant":
      return validateVariantVCF(normalized);
    case "region":
      return validateRegion(normalized);
    case "gene":
      return validateGene(normalized);
  }
}

function validateRsID(query: string): QueryValidation {
  if (!PATTERNS.RSID.test(query)) {
    return {
      isValid: false,
      type: "rsid",
      error: "rsID format should be: rs followed by numbers (e.g., rs7412)",
    };
  }

  return { isValid: true, type: "rsid" };
}

function validateVariantVCF(query: string): QueryValidation {
  const parts = query.split("-");

  if (parts.length !== 4) {
    return {
      isValid: false,
      type: "variant",
      error:
        "Variant VCF format should be: chromosome-position-ref-alt (e.g., 19-392932-A-T)",
    };
  }

  const [chromosome, position, ref, alt] = parts;

  const chrValidation = validateChromosome(chromosome);
  if (!chrValidation.isValid) {
    return {
      isValid: false,
      type: "variant",
      error: chrValidation.error,
    };
  }

  const posValidation = validatePosition(position);
  if (!posValidation.isValid) {
    return {
      isValid: false,
      type: "variant",
      error: posValidation.error,
    };
  }

  if (!isValidAllele(ref) || !isValidAllele(alt)) {
    return {
      isValid: false,
      type: "variant",
      error: "Invalid allele. Use only A, T, C, G nucleotides",
    };
  }

  return {
    isValid: true,
    type: "variant",
    details: {
      chromosome: chrValidation.normalized,
      position: Number.parseInt(position, 10),
    },
  };
}

function validateRegion(query: string): QueryValidation {
  const parts = query.split("-");

  if (parts.length !== 3) {
    return {
      isValid: false,
      type: "region",
      error:
        "Region format should be: chromosome-startPosition-endPosition (e.g., 19-32392932-32492932)",
    };
  }

  const [chromosome, startPos, endPos] = parts;

  const chrValidation = validateChromosome(chromosome);
  if (!chrValidation.isValid) {
    return {
      isValid: false,
      type: "region",
      error: chrValidation.error,
    };
  }

  const startValidation = validatePosition(startPos);
  const endValidation = validatePosition(endPos);

  if (!startValidation.isValid || !endValidation.isValid) {
    return {
      isValid: false,
      type: "region",
      error:
        "Invalid position. Both start and end positions must be positive integers",
    };
  }

  const start = Number.parseInt(startPos, 10);
  const end = Number.parseInt(endPos, 10);

  if (start >= end) {
    return {
      isValid: false,
      type: "region",
      error: "Start position must be less than end position",
    };
  }

  const regionSize = end - start;
  if (regionSize > MAX_REGION_SIZE) {
    return {
      isValid: false,
      type: "region",
      error: "Region size cannot exceed 10MB (10,000,000 base pairs)",
    };
  }

  return {
    isValid: true,
    type: "region",
    details: {
      chromosome: chrValidation.normalized,
      startPosition: start,
      endPosition: end,
    },
  };
}

function validateGene(query: string): QueryValidation {
  if (!PATTERNS.GENE.test(query)) {
    return {
      isValid: false,
      type: "gene",
      error:
        "Gene name should contain only letters, numbers, and hyphens (e.g., APOE, BRCA1)",
    };
  }

  if (query.length < 2 || query.length > 20) {
    return {
      isValid: false,
      type: "gene",
      error: "Gene name should be between 2 and 20 characters",
    };
  }

  return { isValid: true, type: "gene" };
}

interface ChromosomeValidation {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

function validateChromosome(chr: string): ChromosomeValidation {
  const cleaned = chr.replace(PATTERNS.CHR_PREFIX, "").toUpperCase();

  if (!VALID_CHROMOSOMES.includes(cleaned as never)) {
    return {
      isValid: false,
      error:
        "Invalid chromosome. Use 1-22, X, Y, or MT (with or without 'chr' prefix)",
    };
  }

  return {
    isValid: true,
    normalized: cleaned,
  };
}

interface PositionValidation {
  isValid: boolean;
  error?: string;
}

function validatePosition(pos: string): PositionValidation {
  const position = Number.parseInt(pos, 10);

  if (Number.isNaN(position) || position <= 0 || position > MAX_POSITION) {
    return {
      isValid: false,
      error:
        "Invalid position. Must be a positive integer within human genome size",
    };
  }

  return { isValid: true };
}

function isValidAllele(allele: string): boolean {
  return /^[ATCG]+$/i.test(allele) && allele.length >= 1;
}
