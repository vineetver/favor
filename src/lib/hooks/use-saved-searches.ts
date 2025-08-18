"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "genomicSavedSearches";

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  genomicBuild: string;
  timestamp: number;
  description?: string;
}

export interface SavedSearchItem {
  id: string;
  value: string;
  type: "saved";
  data: {
    name: string;
    description?: string;
    timestamp: number;
    genomicBuild: string;
  };
  score: number;
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedSearches(parsed);
        }
      }
    } catch (error) {
      console.warn("Failed to load saved searches:", error);
    }
  }, []);

  const saveSearch = useCallback((
    query: string, 
    name: string, 
    genomicBuild: string,
    description?: string
  ) => {
    if (!query.trim() || !name.trim()) {
      return;
    }

    const newSearch: SavedSearch = {
      id: `saved-${Date.now()}`,
      name: name.trim(),
      query: query.trim(),
      genomicBuild,
      timestamp: Date.now(),
      description: description?.trim(),
    };

    setSavedSearches((prev) => {
      const newSavedSearches = [newSearch, ...prev];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSavedSearches));
      } catch (error) {
        console.warn("Failed to save search:", error);
      }

      return newSavedSearches;
    });

    return newSearch.id;
  }, []);

  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches((prev) => {
      const newSavedSearches = prev.filter(search => search.id !== id);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSavedSearches));
      } catch (error) {
        console.warn("Failed to delete saved search:", error);
      }

      return newSavedSearches;
    });
  }, []);

  const updateSavedSearch = useCallback((
    id: string, 
    updates: Partial<Pick<SavedSearch, 'name' | 'description'>>
  ) => {
    setSavedSearches((prev) => {
      const newSavedSearches = prev.map(search => 
        search.id === id ? { ...search, ...updates } : search
      );

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSavedSearches));
      } catch (error) {
        console.warn("Failed to update saved search:", error);
      }

      return newSavedSearches;
    });
  }, []);

  const getSavedSearchItems = useCallback((): SavedSearchItem[] => {
    return savedSearches.map((search, index) => ({
      id: search.id,
      value: search.query,
      type: "saved" as const,
      data: {
        name: search.name,
        description: search.description,
        timestamp: search.timestamp,
        genomicBuild: search.genomicBuild,
      },
      score: 1.0 - index * 0.01,
    }));
  }, [savedSearches]);

  const findSavedSearch = useCallback((id: string): SavedSearch | undefined => {
    return savedSearches.find(search => search.id === id);
  }, [savedSearches]);

  const clearAllSavedSearches = useCallback(() => {
    setSavedSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear saved searches:", error);
    }
  }, []);

  return {
    savedSearches,
    saveSearch,
    deleteSavedSearch,
    updateSavedSearch,
    getSavedSearchItems,
    findSavedSearch,
    clearAllSavedSearches,
  };
}