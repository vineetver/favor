import { useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/features/search/hooks/use-debounce";
import {
  useSearchHistory,
  useRecentSearches,
} from "@/features/search/hooks/use-search-history";
import { useSavedSearches } from "@/features/search/hooks/use-saved-searches";
import { useSearchSuggestions } from "@/features/search/hooks/use-search-suggestions";
import {
  useSearchInput,
  useSearchActions,
  useSearchAlert,
  type GenomicBuild,
} from "@/features/search/stores/search-store";
import { parseQuery } from "@/features/search/lib/query-parser/parser";
import { validateQuery } from "@/features/search/lib/query-parser/validators";
import { validateAndNavigate } from "@/features/search/utils/navigation";

export function useGenomicSearch() {
  const router = useRouter();
  const { inputValue, selectedGenome } = useSearchInput();
  const { showAlert, alertMessage } = useSearchAlert();
  const { setInputValue, setSelectedGenome, showError } = useSearchActions();
  const { addToHistory, removeFromHistory } = useSearchHistory();

  const saveSearch = useSavedSearches((state) => state.saveSearch);
  const deleteSavedSearch = useSavedSearches(
    (state) => state.deleteSavedSearch,
  );
  const savedSearchesArray = useSavedSearches((state) => state.savedSearches);

  const debouncedInput = useDebounce(inputValue.trim(), 300);

  const recentSearches = useRecentSearches(4);
  const savedSearches = useMemo(
    () =>
      savedSearchesArray.map((item) => ({
        type: "saved" as const,
        value: item.query,
        id: item.id,
        data: item,
      })),
    [savedSearchesArray],
  );

  const { suggestions, isLoading } = useSearchSuggestions({
    query: debouncedInput,
    selectedGenome,
    recentSearches: [...savedSearches, ...recentSearches],
  });

  const handleInputChange = useCallback(
    (value: string) => {
      const parsed = parseQuery(value);
      setInputValue(parsed.formatted);
    },
    [setInputValue],
  );

  const handleGenomeChange = useCallback(
    (value: string | undefined) => {
      if (value) {
        setSelectedGenome(value as GenomicBuild);
      }
    },
    [setSelectedGenome],
  );

  const handleSaveSearch = useCallback(
    (name: string, description?: string) => {
      saveSearch(inputValue, name, selectedGenome, description);
    },
    [inputValue, selectedGenome, saveSearch],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const query = inputValue.trim();

      if (!query) {
        showError("Please enter a search query");
        return;
      }

      // Parse and normalize the query
      const parsed = parseQuery(query);
      const validation = validateQuery(parsed.normalized);

      if (!validation.isValid || !validation.type) {
        showError(validation.error || "Invalid search format");
        return;
      }

      // Use the formatted/normalized value for navigation
      const navigation = validateAndNavigate(
        parsed.formatted,
        validation.type,
        selectedGenome,
      );

      if (!navigation.success) {
        showError(navigation.error || "Navigation failed");
        return;
      }

      // Save the formatted version to history
      addToHistory(parsed.formatted);
      if (navigation.path) {
        router.push(navigation.path);
      }
    },
    [inputValue, selectedGenome, addToHistory, router, showError],
  );

  return {
    inputValue,
    selectedGenome,
    showAlert,
    alertMessage,
    suggestions,
    isLoading,
    handleInputChange,
    handleGenomeChange,
    handleSaveSearch,
    handleSubmit,
    setInputValue,
    removeFromHistory,
    deleteSavedSearch,
  };
}
