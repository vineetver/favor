"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { SearchSuggestion } from "@/lib/search/api/elasticsearch";
import { searchSuggestions } from "@/lib/search/api/elasticsearch";
import { normalizeForApi } from "@/lib/search/formatting/input-formatter";
import type { GenomicBuild } from "@/lib/stores/search-store";
import type { HistoryItem } from "./use-search-history";

const SEARCH_EXAMPLES: SearchSuggestion[] = [
  {
    id: "example-1",
    value: "8-127738167-C-G",
    type: "variant",
    score: 1.0,
  },
  {
    id: "example-2",
    value: "APOE",
    type: "gene",
    data: { chromosome: "19", position: "44905795-44909392" },
    score: 1.0,
  },
  {
    id: "example-3",
    value: "rs7412",
    type: "rsid",
    data: { snp_type: "SNV", genecode_category: "exonic" },
    score: 1.0,
  },
  {
    id: "example-4",
    value: "19-44808820-44908922",
    type: "region",
    score: 1.0,
  },
];

export interface UseSearchSuggestionsProps {
  query: string;
  shouldShowSuggestions: boolean;
  selectedGenome: GenomicBuild;
  recentSearches: HistoryItem[];
}

export function useSearchSuggestions({
  query,
  shouldShowSuggestions,
  selectedGenome,
  recentSearches,
}: UseSearchSuggestionsProps) {
  const normalizedQuery = useMemo(() => normalizeForApi(query), [query]);

  const {
    data: apiSuggestions = [],
    isLoading,
    error,
  } = useQuery<SearchSuggestion[]>({
    queryKey: ["search-suggestions", normalizedQuery, selectedGenome],
    queryFn: async ({ signal }) => {
      try {
        const controller = new AbortController();
        if (signal?.aborted) {
          controller.abort();
        }
        const results = await searchSuggestions(normalizedQuery, controller);
        return results;
      } catch (err) {
        // If aborted, don't throw error
        if (err instanceof Error && err.name === "AbortError") {
          return [];
        }
        throw err;
      }
    },
    enabled: shouldShowSuggestions && normalizedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error && typeof error === "object" && "status" in error) {
        const status = error.status as number;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 2;
    },
  });

  // Memoize the deduplication logic
  const deduplicateItems = useCallback((items: SearchSuggestion[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  // Memoize the empty query suggestions
  const emptyQuerySuggestions = useMemo(() => {
    const combined = [...recentSearches, ...SEARCH_EXAMPLES];
    return deduplicateItems(combined);
  }, [recentSearches, deduplicateItems]);

  const displayedSuggestions = useMemo(() => {
    if (shouldShowSuggestions && query.length >= 2) {
      return apiSuggestions;
    }

    if (query.length === 0) {
      return emptyQuerySuggestions;
    }

    return [];
  }, [
    shouldShowSuggestions,
    query.length,
    apiSuggestions,
    emptyQuerySuggestions,
  ]);

  return {
    suggestions: displayedSuggestions,
    isLoading: isLoading && shouldShowSuggestions,
    error,
    hasError: Boolean(error),
  };
}
