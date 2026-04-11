// src/features/genome-browser/utils/region-parser.ts
// Parse, don't validate - region parsing utilities

import {
  createGenomicRegion,
  type GenomicRegion,
  isValidChromosome,
} from "../types/state";

// ─────────────────────────────────────────────────────────────────────────────
// PARSE RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// REGION PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a region string in various formats:
 * - chr17:41196312-41276312
 * - chr17:41,196,312-41,276,312 (with commas)
 * - 17:41196312-41276312 (without 'chr' prefix)
 */
export function parseRegion(input: string): ParseResult<GenomicRegion> {
  if (!input || typeof input !== "string") {
    return { ok: false, error: "Region string is required" };
  }

  // Remove whitespace
  const cleaned = input.trim();

  // Match pattern: chr?X:start-end
  const match = cleaned.match(/^(chr)?(\d{1,2}|[XYM]):?([\d,]+)-([\d,]+)$/i);

  if (!match) {
    return {
      ok: false,
      error: "Invalid region format. Expected: chr17:41196312-41276312",
    };
  }

  const [, , chrNum, startStr, endStr] = match;

  // Normalize chromosome (always use 'chr' prefix)
  const chromosome = `chr${chrNum.toUpperCase()}`;

  if (!isValidChromosome(chromosome)) {
    return { ok: false, error: `Invalid chromosome: ${chromosome}` };
  }

  // Parse positions (remove commas)
  const start = parseInt(startStr.replace(/,/g, ""), 10);
  const end = parseInt(endStr.replace(/,/g, ""), 10);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { ok: false, error: "Start and end positions must be numbers" };
  }

  const region = createGenomicRegion(chromosome, start, end);

  if (!region) {
    return {
      ok: false,
      error:
        "Invalid region: start must be less than end and both must be positive",
    };
  }

  return { ok: true, value: region };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGION FORMATTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a region for display with optional comma separators
 */
export function formatRegion(
  region: GenomicRegion,
  options?: { commas?: boolean },
): string {
  const { commas = true } = options ?? {};

  const start = commas
    ? region.start.toLocaleString()
    : region.start.toString();
  const end = commas ? region.end.toLocaleString() : region.end.toString();

  return `${region.chromosome}:${start}-${end}`;
}

/**
 * Format region size for display (e.g., "80kb", "1.2Mb")
 */
export function formatRegionSize(size: number): string {
  if (size < 1000) {
    return `${size}bp`;
  }
  if (size < 1_000_000) {
    const kb = size / 1000;
    return kb >= 10 ? `${Math.round(kb)}kb` : `${kb.toFixed(1)}kb`;
  }
  const mb = size / 1_000_000;
  return mb >= 10 ? `${Math.round(mb)}Mb` : `${mb.toFixed(1)}Mb`;
}

/**
 * Format a region with size annotation
 */
export function formatRegionWithSize(region: GenomicRegion): string {
  return `${formatRegion(region)} (${formatRegionSize(region.size)})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGION MANIPULATION
// ─────────────────────────────────────────────────────────────────────────────

import { MAX_REGION_SIZE, MIN_REGION_SIZE, ZOOM_FACTOR } from "../types/state";

/**
 * Zoom into a region (decrease size by factor)
 */
export function zoomIn(region: GenomicRegion): GenomicRegion | null {
  const center = Math.floor((region.start + region.end) / 2);
  const newSize = Math.floor(region.size / ZOOM_FACTOR);

  if (newSize < MIN_REGION_SIZE) {
    return null; // Can't zoom in further
  }

  const halfSize = Math.floor(newSize / 2);
  const newStart = Math.max(0, center - halfSize);
  const newEnd = newStart + newSize;

  return createGenomicRegion(region.chromosome as string, newStart, newEnd);
}

/**
 * Zoom out of a region (increase size by factor)
 */
export function zoomOut(region: GenomicRegion): GenomicRegion | null {
  const center = Math.floor((region.start + region.end) / 2);
  const newSize = Math.floor(region.size * ZOOM_FACTOR);

  if (newSize > MAX_REGION_SIZE) {
    return null; // Can't zoom out further
  }

  const halfSize = Math.floor(newSize / 2);
  const newStart = Math.max(0, center - halfSize);
  const newEnd = newStart + newSize;

  return createGenomicRegion(region.chromosome as string, newStart, newEnd);
}

/**
 * Pan the region left (toward 5' end)
 */
export function panLeft(
  region: GenomicRegion,
  fraction: number = 0.25,
): GenomicRegion | null {
  const shift = Math.floor(region.size * fraction);
  const newStart = Math.max(0, region.start - shift);
  const newEnd = newStart + region.size;

  return createGenomicRegion(region.chromosome as string, newStart, newEnd);
}

/**
 * Pan the region right (toward 3' end)
 */
export function panRight(
  region: GenomicRegion,
  fraction: number = 0.25,
): GenomicRegion | null {
  const shift = Math.floor(region.size * fraction);
  const newStart = region.start + shift;
  const newEnd = newStart + region.size;

  return createGenomicRegion(region.chromosome as string, newStart, newEnd);
}

/**
 * Center the region on a specific position
 */
export function centerOn(
  region: GenomicRegion,
  position: number,
): GenomicRegion | null {
  const halfSize = Math.floor(region.size / 2);
  const newStart = Math.max(0, position - halfSize);
  const newEnd = newStart + region.size;

  return createGenomicRegion(region.chromosome as string, newStart, newEnd);
}

// ─────────────────────────────────────────────────────────────────────────────
// URL PARSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse region from URL search params
 */
export function parseRegionParam(param: string | null): GenomicRegion | null {
  if (!param) return null;
  const result = parseRegion(param);
  return result.ok ? result.value : null;
}

/**
 * Parse track IDs from URL search params
 */
export function parseTracksParam(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
