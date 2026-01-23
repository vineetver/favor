/**
 * Variant preloader - fetch variant data before navigation
 * Provides instant navigation experience by preloading data
 */

import { fetchVariant, fetchVariantsByRsid } from '@/features/variant/api/variant';
import type { Variant } from '@/features/variant/types';
import type { ParsedVariantQuery } from '../types/query';
import { parseQuery } from './query-parser';

/**
 * In-memory cache for preloaded variants
 * Cleared on page navigation or after timeout
 */
const preloadCache = new Map<string, { data: Variant | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached variant if available and not expired
 */
export function getCachedVariant(normalized: string): Variant | null {
  const cached = preloadCache.get(normalized);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    preloadCache.delete(normalized);
    return null;
  }

  return cached.data;
}

/**
 * Preload variant data if query is a complete VCF or rsID
 * Returns null if query is invalid or incomplete
 */
export async function preloadVariant(query: string): Promise<Variant | null> {
  const parsed = parseQuery(query);

  // Only preload if query is valid and complete
  if (!parsed.isValid) {
    return null;
  }

  const normalized = parsed.normalized;

  // Check cache first
  const cached = getCachedVariant(normalized);
  if (cached !== null) {
    return cached;
  }

  // Fetch variant data based on type
  let variant: Variant | null = null;

  if (parsed.type === 'variant_vcf') {
    const variantParsed = parsed as ParsedVariantQuery;
    if (variantParsed.vcf) {
      variant = await fetchVariant(variantParsed.vcf.normalized);
    }
  } else if (parsed.type === 'variant_rsid') {
    const variantParsed = parsed as ParsedVariantQuery;
    if (variantParsed.rsid) {
      variant = await fetchVariantsByRsid(variantParsed.rsid);
    }
  }

  // Cache the result (even if null)
  preloadCache.set(normalized, {
    data: variant,
    timestamp: Date.now(),
  });

  return variant;
}

/**
 * Check if variant exists in our database (from preload or cache)
 */
export function isVariantInDatabase(normalized: string): boolean {
  const cached = getCachedVariant(normalized);
  return cached !== null;
}

/**
 * Clear preload cache
 */
export function clearPreloadCache(): void {
  preloadCache.clear();
}

/**
 * Preload variant with debounce to avoid excessive API calls
 * Use this for real-time preloading as user types
 */
let preloadTimer: NodeJS.Timeout | null = null;

export function preloadVariantDebounced(
  query: string,
  delay: number = 500
): Promise<Variant | null> {
  return new Promise((resolve) => {
    if (preloadTimer) {
      clearTimeout(preloadTimer);
    }

    preloadTimer = setTimeout(async () => {
      const result = await preloadVariant(query);
      resolve(result);
    }, delay);
  });
}
