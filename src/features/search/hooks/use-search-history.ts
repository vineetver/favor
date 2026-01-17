import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SearchHistoryState {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;

        set((state) => {
          const filtered = state.history.filter((item) => item !== trimmed);
          return { history: [trimmed, ...filtered].slice(0, 50) };
        });
      },
      removeFromHistory: (query: string) => {
        set((state) => ({
          history: state.history.filter((item) => item !== query),
        }));
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "search-history",
    },
  ),
);

export function useRecentSearches(limit = 5) {
  const history = useSearchHistory((state) => state.history);

  return useMemo(
    () =>
      history.slice(0, limit).map((item) => ({
        type: "history" as const,
        value: item,
        id: `history-${item}`,
      })),
    [history, limit],
  );
}
