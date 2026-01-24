"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface SearchContextValue {
  isOpen: boolean;
  initialQuery: string;
  openSearch: (query?: string) => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const openSearch = useCallback((query = "") => {
    setInitialQuery(query);
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    // Clear initial query after a short delay to allow the search to close smoothly
    setTimeout(() => setInitialQuery(""), 200);
  }, []);

  // Store current state in ref to avoid re-attaching listener on state changes
  const isOpenRef = useRef(isOpen);
  const openSearchRef = useRef(openSearch);
  const closeSearchRef = useRef(closeSearch);

  // Keep refs in sync with current values
  useEffect(() => {
    isOpenRef.current = isOpen;
    openSearchRef.current = openSearch;
    closeSearchRef.current = closeSearch;
  });

  // Global Command-K shortcut - listener attached once, uses refs for current values
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpenRef.current) {
          closeSearchRef.current();
        } else {
          openSearchRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty deps - listener attached once

  return (
    <SearchContext.Provider
      value={{ isOpen, initialQuery, openSearch, closeSearch }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return context;
}
