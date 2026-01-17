import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type GenomicBuild = "hg38" | "hg19";

/**
 * Search State
 *
 * Following Commandment II (Make Invalid States Unrepresentable) and
 * Commandment XV (Single Source of Truth):
 * - `error` is null when no error, string when error exists
 * - No derived state stored (hasInput, hasError are computed)
 */
export interface SearchState {
  query: string;
  genome: GenomicBuild;
  error: string | null;
}

export interface SearchActions {
  setQuery: (value: string) => void;
  setGenome: (genome: GenomicBuild) => void;
  setError: (message: string) => void;
  clearError: () => void;
  reset: () => void;
}

export type SearchStore = SearchState & SearchActions;

const initialState: SearchState = {
  query: "",
  genome: "hg38",
  error: null,
};

export const useSearchStore = create<SearchStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setQuery: (value: string) => {
          set(
            (state) => ({
              query: value,
              // Clear error when user starts typing (Commandment III - explicit action)
              error: value.trim() ? null : state.error,
            }),
            false,
            "setQuery",
          );
        },

        setGenome: (genome: GenomicBuild) => {
          set({ genome }, false, "setGenome");
        },

        setError: (message: string) => {
          set({ error: message }, false, "setError");
        },

        clearError: () => {
          set({ error: null }, false, "clearError");
        },

        reset: () => {
          set(initialState, false, "reset");
        },
      }),
      {
        name: "search-store",
        partialize: (state) => ({
          genome: state.genome,
        }),
      },
    ),
    { name: "SearchStore" },
  ),
);

// ============================================
// Selectors (Commandment XV - Derive, Don't Store)
// ============================================

/** Get the current query */
export const useSearchQuery = () => useSearchStore((s) => s.query);

/** Get the selected genome build */
export const useSearchGenome = () => useSearchStore((s) => s.genome);

/** Get error state - null if no error */
export const useSearchError = () => useSearchStore((s) => s.error);

/** Derived: true if query has content */
export const useHasInput = () =>
  useSearchStore((s) => s.query.trim().length > 0);

/** Derived: true if there's an error */
export const useHasError = () => useSearchStore((s) => s.error !== null);

// ============================================
// Composite Selectors (for components needing multiple values)
// ============================================

/** Get query + genome together (common pairing) */
export const useSearchInput = () => {
  const query = useSearchStore((s) => s.query);
  const genome = useSearchStore((s) => s.genome);
  return { inputValue: query, selectedGenome: genome };
};

/** Get error alert state */
export const useSearchAlert = () => {
  const error = useSearchStore((s) => s.error);
  return {
    showAlert: error !== null,
    alertMessage: error ?? "",
    hasError: error !== null,
  };
};

/** Get all actions (stable references) */
export const useSearchActions = () => {
  const setQuery = useSearchStore((s) => s.setQuery);
  const setGenome = useSearchStore((s) => s.setGenome);
  const setError = useSearchStore((s) => s.setError);
  const clearError = useSearchStore((s) => s.clearError);
  const reset = useSearchStore((s) => s.reset);

  return {
    // New API
    setQuery,
    setGenome,
    setError,
    clearError,
    reset,
    // Legacy API (backwards compatible)
    setInputValue: setQuery,
    setSelectedGenome: setGenome,
    showError: setError,
    hideAlert: clearError,
    resetSearch: reset,
    clearInput: () => {
      setQuery("");
      clearError();
    },
    setSearchState: (partial: {
      inputValue?: string;
      selectedGenome?: GenomicBuild;
    }) => {
      if (partial.inputValue !== undefined) setQuery(partial.inputValue);
      if (partial.selectedGenome !== undefined)
        setGenome(partial.selectedGenome);
    },
  };
};
