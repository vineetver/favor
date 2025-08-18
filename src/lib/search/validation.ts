import type { QueryType } from "@/lib/search/formatting/input-formatter";

export interface ValidationResult {
  isValid: boolean;
  type: QueryType | null;
  error?: string;
}
export function validateQuery(query: string): ValidationResult {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      isValid: false,
      type: null,
      error: "Please enter a search query",
    };
  }

  const parts = trimmedQuery.split("-");

  if (isRsID(trimmedQuery)) {
    return validateRsID(trimmedQuery);
  }

  // Check for Variant VCF format: chromosome-position-ref-alt (4 parts)
  if (parts.length === 4 && isVariantVCF(trimmedQuery)) {
    return validateVariantVCF(trimmedQuery);
  }

  // Check for Region format: chromosome-startPosition-endPosition (3 parts)
  if (parts.length === 3 && isRegion(trimmedQuery)) {
    return validateRegion(trimmedQuery);
  }

  // Default to gene name if it doesn't match other patterns
  return validateGeneName(trimmedQuery);
}

function isVariantVCF(query: string): boolean {
  // Pattern: chromosome-position-ref-alt (e.g., 19-392932-A-T)
  const variantPattern = /^(chr)?(\d{1,2}|X|Y|MT?)-\d+-[ATCG]+-[ATCG]+$/i;
  return variantPattern.test(query);
}

function isRsID(query: string): boolean {
  // Pattern: rs followed by numbers
  const rsidPattern = /^rs\d+$/i;
  return rsidPattern.test(query);
}

function isRegion(query: string): boolean {
  // Pattern: chromosome-startPosition-endPosition
  const regionPattern = /^(chr)?(\d{1,2}|X|Y|MT?)-\d+-\d+$/i;
  return regionPattern.test(query);
}

function validateVariantVCF(query: string): ValidationResult {
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

  // Validate chromosome
  if (!isValidChromosome(chromosome)) {
    return {
      isValid: false,
      type: "variant",
      error:
        "Invalid chromosome. Use 1-22, X, Y, or MT (with or without 'chr' prefix)",
    };
  }

  // Validate position
  if (!isValidPosition(position)) {
    return {
      isValid: false,
      type: "variant",
      error: "Invalid position. Must be a positive integer",
    };
  }

  // Validate ref and alt alleles
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
  };
}

function validateRsID(query: string): ValidationResult {
  const rsidPattern = /^rs\d+$/i;

  if (!rsidPattern.test(query)) {
    return {
      isValid: false,
      type: "rsid",
      error: "rsID format should be: rs followed by numbers (e.g., rs7412)",
    };
  }

  return {
    isValid: true,
    type: "rsid",
  };
}

function validateRegion(query: string): ValidationResult {
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

  // Validate chromosome
  if (!isValidChromosome(chromosome)) {
    return {
      isValid: false,
      type: "region",
      error:
        "Invalid chromosome. Use 1-22, X, Y, or MT (with or without 'chr' prefix)",
    };
  }

  // Validate positions
  if (!isValidPosition(startPos) || !isValidPosition(endPos)) {
    return {
      isValid: false,
      type: "region",
      error:
        "Invalid position. Both start and end positions must be positive integers",
    };
  }

  const start = parseInt(startPos);
  const end = parseInt(endPos);

  if (start >= end) {
    return {
      isValid: false,
      type: "region",
      error: "Start position must be less than end position",
    };
  }

  const regionSize = end - start;
  if (regionSize > 10000000) {
    return {
      isValid: false,
      type: "region",
      error: "Region size cannot exceed 10MB (10,000,000 base pairs)",
    };
  }

  return {
    isValid: true,
    type: "region",
  };
}

function validateGeneName(query: string): ValidationResult {
  // Basic gene name validation
  const genePattern = /^[A-Z][A-Z0-9-]*$/i;

  if (!genePattern.test(query)) {
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

  return {
    isValid: true,
    type: "gene",
  };
}

function isValidChromosome(chromosome: string): boolean {
  const cleanChr = chromosome.replace(/^chr/i, "");
  const validChromosomes = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "X",
    "Y",
    "MT",
    "M",
  ];
  return validChromosomes.includes(cleanChr.toUpperCase());
}

function isValidPosition(position: string): boolean {
  const pos = parseInt(position);
  return !Number.isNaN(pos) && pos > 0 && pos <= 300000000; // Human genome size limit
}

function isValidAllele(allele: string): boolean {
  const allelePattern = /^[ATCG]+$/i;
  return allelePattern.test(allele) && allele.length >= 1;
}
