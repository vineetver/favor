"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  // Tracks the most recent openSearch call so a stale 200ms cleanup
  // from a prior closeSearch doesn't clobber a fresh initialQuery.
  const initialQueryGenRef = useRef(0);

  const openSearch = useCallback(
    (query = "") => {
      initialQueryGenRef.current += 1;
      setInitialQuery(query);
      setIsOpen(true);
      // The search box only renders on "/". Bring the user there so the
      // shortcut works from any page.
      if (pathnameRef.current !== "/") {
        router.push("/");
      }
    },
    [router],
  );

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    // Clear initial query after a short delay to allow the search to close
    // smoothly — but only if no later openSearch has bumped the generation.
    const gen = initialQueryGenRef.current;
    setTimeout(() => {
      if (initialQueryGenRef.current === gen) setInitialQuery("");
    }, 200);
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
