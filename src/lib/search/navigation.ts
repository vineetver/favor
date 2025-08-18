import type { QueryType } from "@/lib/search/formatting/input-formatter";
import type { GenomicBuild } from "@/lib/stores/search-store";

export interface NavigationResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Generates the appropriate route path for a search query
 */
export function getSearchRoute(
  query: string,
  queryType: QueryType,
  genomeBuild: GenomicBuild,
): NavigationResult {
  const genome = genomeBuild.toLowerCase();

  try {
    const routes: Record<QueryType, string> = {
      rsid: `/${genome}/rsid/${query.toLowerCase()}/summary/basic`,
      gene: `/${genome}/gene/${query.toUpperCase()}/gene-level-annotation/info-and-ids`,
      variant: `/${genome}/variant/${query.toUpperCase()}/summary/basic`,
      region: `/${genome}/region/${query}/SNV-summary/allele-distribution`,
    };

    const path = routes[queryType];

    if (!path) {
      return {
        success: false,
        error: `Unknown query type: ${queryType}`,
      };
    }

    return {
      success: true,
      path,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate route",
    };
  }
}

/**
 * Validates and navigates to search results
 */
export function validateAndNavigate(
  query: string,
  queryType: QueryType | null,
  genomeBuild: GenomicBuild,
): NavigationResult {
  if (!query.trim()) {
    return {
      success: false,
      error: "Search query cannot be empty",
    };
  }

  if (!queryType) {
    return {
      success: false,
      error: "Invalid search format. Please check your input.",
    };
  }

  return getSearchRoute(query, queryType, genomeBuild);
}
