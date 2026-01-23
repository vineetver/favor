/**
 * VCF notation parser
 *
 * Supports multiple separators and formats:
 * - 19-44908822-C-T
 * - chr19-44908822-C-T
 * - 19:44908822-C-T
 * - 19:44908822:C:T
 * - 19-44908822-C>T
 * - chr19:44908822-C>T
 *
 * Pattern: [1..22,X,Y,MT]-[Position 1..300M]-{Allele}-{Allele}
 */

import type { VariantVCF } from "../types/query";

const VALID_CHROMOSOMES = new Set([
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
]);

const MAX_POSITION = 300_000_000;

/**
 * Normalize chromosome notation
 * chr19 -> 19, chrX -> X, chrMT -> MT
 */
function normalizeChromosome(chr: string): string | null {
  const cleaned = chr.toUpperCase().replace(/^CHR/, "");
  return VALID_CHROMOSOMES.has(cleaned) ? cleaned : null;
}

/**
 * Validate position is within acceptable range
 */
function isValidPosition(pos: number): boolean {
  return Number.isInteger(pos) && pos >= 1 && pos <= MAX_POSITION;
}

/**
 * Validate allele notation (A, T, C, G, or multi-char like AT, DEL, etc)
 */
function isValidAllele(allele: string): boolean {
  // Allow DNA bases and standard notation like DEL, INS, DUP
  return /^[ATCGN]+$|^(DEL|INS|DUP)$/i.test(allele) && allele.length > 0;
}

/**
 * Parse VCF notation with flexible separators
 * Returns null if invalid
 */
export function parseVCF(query: string): VariantVCF | null {
  const trimmed = query.trim();

  // Split by common separators: - : > _
  const parts = trimmed.split(/[-:>_]/);

  // Must have exactly 4 parts: chr, pos, ref, alt
  if (parts.length !== 4) {
    return null;
  }

  const [chrRaw, posRaw, ref, alt] = parts;

  // Validate chromosome
  const chromosome = normalizeChromosome(chrRaw);
  if (!chromosome) {
    return null;
  }

  // Validate position
  const position = parseInt(posRaw, 10);
  if (!isValidPosition(position)) {
    return null;
  }

  // Validate alleles
  const refUpper = ref.toUpperCase();
  const altUpper = alt.toUpperCase();

  if (!isValidAllele(refUpper) || !isValidAllele(altUpper)) {
    return null;
  }

  // Cannot have identical ref and alt
  if (refUpper === altUpper) {
    return null;
  }

  // Build normalized format: chr-pos-ref-alt
  const normalized = `${chromosome}-${position}-${refUpper}-${altUpper}`;

  return {
    chromosome,
    position,
    ref: refUpper,
    alt: altUpper,
    normalized,
  };
}

/**
 * Check if query looks like a VCF notation (partial or complete)
 */
export function looksLikeVCF(query: string): boolean {
  const trimmed = query.trim();

  // Check for chromosome prefix patterns
  if (/^(chr)?(([1-9]|1\d|2[0-2])|[XYxy]|MT|mt)[-:>_]/.test(trimmed)) {
    return true;
  }

  // Check for position-only patterns (could be partial input)
  if (/^\d+[-:>_]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Check if query is a complete VCF notation (all 4 parts present)
 */
export function isCompleteVCF(query: string): boolean {
  const parsed = parseVCF(query);
  return parsed !== null;
}
