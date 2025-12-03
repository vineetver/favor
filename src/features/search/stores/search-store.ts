import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type GenomicBuild = "hg38" | "hg19";

export interface SearchState {
  inputValue: string;
  selectedGenome: GenomicBuild;
  showAlert: boolean;
  alertMessage: string;
  hasInput: boolean;
  hasError: boolean;
}

export interface SearchActions {
  setInputValue: (value: string) => void;
  clearInput: () => void;
  setSelectedGenome: (genome: GenomicBuild) => void;
  showError: (message: string) => void;
  hideAlert: () => void;
  resetSearch: () => void;
  setSearchState: (
    partial: Partial<Pick<SearchState, "inputValue" | "selectedGenome">>,
  ) => void;
}

export type SearchStore = SearchState & SearchActions;

// Initial state
const initialState: SearchState = {
  inputValue: "",
  selectedGenome: "hg38",
  showAlert: false,
  alertMessage: "",
  hasInput: false,
  hasError: false,
};

export const useSearchStore = create<SearchStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setInputValue: (value: string) => {
          const trimmed = value.trim();
          const currentState = get();

          // Only update if value actually changed
          if (currentState.inputValue === value) return;

          set(
            {
              inputValue: value,
              hasInput: trimmed.length > 0,
              showAlert: trimmed.length > 0 ? false : currentState.showAlert,
              alertMessage: trimmed.length > 0 ? "" : currentState.alertMessage,
            },
            false,
            "setInputValue",
          );
        },

        clearInput: () => {
          set(
            {
              inputValue: "",
              hasInput: false,
              showAlert: false,
              alertMessage: "",
            },
            false,
            "clearInput",
          );
        },

        setSelectedGenome: (genome: GenomicBuild) => {
          set({ selectedGenome: genome }, false, "setSelectedGenome");
        },

        showError: (message: string) => {
          set(
            {
              showAlert: true,
              alertMessage: message,
              hasError: true,
            },
            false,
            "showError",
          );
        },

        hideAlert: () => {
          set(
            {
              showAlert: false,
              alertMessage: "",
              hasError: false,
            },
            false,
            "hideAlert",
          );
        },

        resetSearch: () => {
          set(
            {
              ...initialState,
            },
            false,
            "resetSearch",
          );
        },

        setSearchState: (partial) => {
          const updates: Partial<SearchState> = { ...partial };
          if ("inputValue" in updates && updates.inputValue !== undefined) {
            const trimmed = updates.inputValue.trim();
            updates.hasInput = trimmed.length > 0;
          }

          set(updates, false, "setSearchState");
        },
      }),
      {
        name: "search-store",
        partialize: (state) => ({
          selectedGenome: state.selectedGenome,
        }),
      },
    ),
    {
      name: "SearchStore",
    },
  ),
);

// Optimized composite selectors to reduce subscriptions
export const useSearchValue = () => useSearchStore((state) => state.inputValue);
export const useSelectedGenome = () =>
  useSearchStore((state) => state.selectedGenome);

// Composite selectors for related state
export const useSearchAlert = () => {
  const showAlert = useSearchStore((state) => state.showAlert);
  const alertMessage = useSearchStore((state) => state.alertMessage);
  const hasError = useSearchStore((state) => state.hasError);
  return { showAlert, alertMessage, hasError };
};

// Composite selector for all input-related state
export const useSearchInput = () => {
  const inputValue = useSearchStore((state) => state.inputValue);
  const hasInput = useSearchStore((state) => state.hasInput);
  const selectedGenome = useSearchStore((state) => state.selectedGenome);
  return { inputValue, hasInput, selectedGenome };
};

// Action selectors (stable references)
export const useSearchActions = () => {
  const setInputValue = useSearchStore((state) => state.setInputValue);
  const clearInput = useSearchStore((state) => state.clearInput);
  const setSelectedGenome = useSearchStore((state) => state.setSelectedGenome);
  const showError = useSearchStore((state) => state.showError);
  const hideAlert = useSearchStore((state) => state.hideAlert);
  const resetSearch = useSearchStore((state) => state.resetSearch);
  const setSearchState = useSearchStore((state) => state.setSearchState);
  return {
    setInputValue,
    clearInput,
    setSelectedGenome,
    showError,
    hideAlert,
    resetSearch,
    setSearchState,
  };
};
