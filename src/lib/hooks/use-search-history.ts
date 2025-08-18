"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "genomicSearchHistory";
const MAX_HISTORY_ITEMS = 10;

export interface HistoryItem {
  id: string;
  value: string;
  type: "history";
  data: Record<string, never>;
  score: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.warn("Failed to load search history:", error);
    }
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    setHistory((prev) => {
      const exists = prev.some(
        (item) => item.toLowerCase() === query.toLowerCase(),
      );

      if (exists) return prev;

      const newHistory = [query, ...prev].slice(0, MAX_HISTORY_ITEMS);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.warn("Failed to save search history:", error);
      }

      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear search history:", error);
    }
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter(
        (item) => item.toLowerCase() !== query.toLowerCase(),
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.warn("Failed to update search history:", error);
      }

      return newHistory;
    });
  }, []);

  const getRecentSearches = useCallback((): HistoryItem[] => {
    return history.slice(0, 3).map((search, index) => ({
      id: `history-${index}`,
      value: search,
      type: "history" as const,
      data: {},
      score: 0.9 - index * 0.1,
    }));
  }, [history]);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
    getRecentSearches,
  };
}
