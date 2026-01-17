import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AutocompleteOption } from "@/components/ui/autocomplete";
import { getSuggestions } from "@/features/search/actions/get-suggestions";
import {
  parseQuery,
  shouldShowSuggestions as shouldShow,
} from "@/features/search/lib/query-parser/parser";
import type { GenomicBuild } from "@/features/search/stores/search-store";

const SEARCH_EXAMPLES: AutocompleteOption[] = [
  {
    id: "example-1",
    value: "8-127738167-C-G",
    type: "variant",
    label: "8-127738167-C-G",
  },
  {
    id: "example-2",
    value: "APOE",
    type: "gene",
    label: "APOE",
    data: { chromosome: "19", position: "44905795-44909392" },
  },
  {
    id: "example-3",
    value: "rs7412",
    type: "rsid",
    label: "rs7412",
    data: { snp_type: "SNV", genecode_category: "exonic" },
  },
  {
    id: "example-4",
    value: "19-44808820-44908922",
    type: "region",
    label: "19-44808820-44908922",
  },
];

interface UseSearchSuggestionsProps {
  query: string;
  selectedGenome: GenomicBuild;
  recentSearches?: AutocompleteOption[];
}

export function useSearchSuggestions({
  query,
  selectedGenome,
  recentSearches = [],
}: UseSearchSuggestionsProps) {
  const parsed = useMemo(() => parseQuery(query), [query]);
  const shouldShowSuggestions = useMemo(() => shouldShow(parsed), [parsed]);

  const {
    data: apiSuggestions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search-suggestions", parsed.normalized, selectedGenome],
    queryFn: () => getSuggestions(parsed.normalized),
    enabled: shouldShowSuggestions && parsed.normalized.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const displayedSuggestions = useMemo(() => {
    if (shouldShowSuggestions && parsed.trimmed.length >= 2) {
      return apiSuggestions;
    }

    if (parsed.trimmed.length === 0) {
      const seen = new Set<string>();
      return [...recentSearches, ...SEARCH_EXAMPLES].filter((item) => {
        const key = item.value.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return [];
  }, [shouldShowSuggestions, parsed, apiSuggestions, recentSearches]);

  return {
    suggestions: displayedSuggestions,
    isLoading: isLoading && shouldShowSuggestions,
    error,
    hasError: Boolean(error),
  };
}
