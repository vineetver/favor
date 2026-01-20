/**
 * Query router - determines navigation destination based on query type
 */

import type { RouteDestination } from '../types/query';
import { parseQuery } from './query-parser';
import { preloadVariant } from './variant-preloader';

/**
 * Get route destination for a given query
 * Returns null if query cannot be routed
 */
export function getRouteForQuery(
  query: string,
  genome: 'hg38' | 'hg19' = 'hg38'
): RouteDestination | null {
  const parsed = parseQuery(query);

  // Only route valid queries
  if (!parsed.isValid) {
    return null;
  }

  switch (parsed.type) {
    case 'variant_vcf':
      if (!parsed.vcf) {
        return null;
      }

      return {
        path: `/${genome}/variant/${encodeURIComponent(parsed.vcf.normalized)}/global-annotation/llm-summary`,
        shouldPreload: true,
        preloadFn: () => preloadVariant(query),
      };

    case 'variant_rsid':
      if (!('rsid' in parsed) || !parsed.rsid) {
        return null;
      }

      return {
        path: `/${genome}/variant/${encodeURIComponent(parsed.rsid)}/global-annotation/llm-summary`,
        shouldPreload: true,
        preloadFn: () => preloadVariant(query),
      };

    case 'drug':
      return {
        path: `/drug/${encodeURIComponent(parsed.normalized)}`,
        shouldPreload: false,
      };

    case 'gene':
      // TODO: Implement gene routing
      // return {
      //   path: `/gene/${encodeURIComponent(parsed.normalized)}`,
      //   shouldPreload: false,
      // };
      return null;

    case 'disease':
      return {
        path: `/disease/${encodeURIComponent(parsed.normalized)}`,
        shouldPreload: false,
      };

    case 'pathway':
      // TODO: Implement pathway routing
      return null;

    default:
      return null;
  }
}

/**
 * Navigate to query destination with preloading
 * Returns true if navigation was initiated, false if query is invalid
 */
export async function navigateToQuery(
  query: string,
  genome: 'hg38' | 'hg19',
  router: { push: (path: string) => void }
): Promise<boolean> {
  const route = getRouteForQuery(query, genome);

  if (!route) {
    return false;
  }

  // Preload data if needed (don't wait for it)
  if (route.shouldPreload && route.preloadFn) {
    route.preloadFn().catch((err) => {
      console.error('Preload failed:', err);
    });
  }

  // Navigate immediately
  router.push(route.path);

  return true;
}

/**
 * Check if query can be routed
 */
export function isRoutableQuery(query: string): boolean {
  const route = getRouteForQuery(query);
  return route !== null;
}
