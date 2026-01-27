"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTypeahead } from "../api/search-api";
import type { EntityType, TypeaheadResponse } from "../types/api";

interface UseTypeaheadOptions {
  /**
   * Minimum query length before searching (default: 2)
   */
  minLength?: number;

  /**
   * Debounce delay in milliseconds (default: 150)
   */
  debounce?: number;

  /**
   * Entity types to search (default: all)
   */
  types?: EntityType[];

  /**
   * Max results per type (default: 5)
   */
  limit?: number;

  /**
   * Include link counts (default: true)
   */
  includeLinks?: boolean;

  /**
   * Include linked entities (default: true)
   */
  includeLinked?: boolean;

  /**
   * Callback when search completes
   */
  onResults?: (results: TypeaheadResponse) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

export function useTypeahead(options: UseTypeaheadOptions = {}) {
  const {
    minLength = 2,
    debounce = 150,
    types,
    limit = 5,
    includeLinks = true,
    includeLinked = true,
    onResults,
    onError,
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TypeaheadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // React 19: Request versioning to ignore stale responses
  const requestIdRef = useRef(0);

  // Store callbacks in refs to avoid re-creating search function when callbacks change
  // This prevents debounce reset when parent re-renders with new callback references
  const onResultsRef = useRef(onResults);
  const onErrorRef = useRef(onError);

  // Keep refs in sync with current callback values
  onResultsRef.current = onResults;
  onErrorRef.current = onError;

  const search = useCallback(
    async (searchQuery: string) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear previous results if query is too short
      if (searchQuery.length < minLength) {
        setResults(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Increment request ID for this new request
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetchTypeahead({
          q: searchQuery,
          types: types?.join(","),
          limit,
          include_links: includeLinks,
          include_linked: includeLinked,
          signal: abortControllerRef.current.signal,
        });

        // Only update if this is still the latest request (prevents race conditions)
        if (currentRequestId === requestIdRef.current) {
          setResults(response);
          onResultsRef.current?.(response);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Search failed");

        // Don't set error for aborted requests
        if (error.name !== "AbortError") {
          // Only update error if this is still the latest request
          if (currentRequestId === requestIdRef.current) {
            setError(error);
            onErrorRef.current?.(error);
          }
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      }
    },
    [minLength, types, limit, includeLinks, includeLinked],
  );

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      search(query);
    }, debounce);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, search, debounce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Force refetch with current query (useful after clearing anchor)
  const refetch = useCallback(() => {
    if (query.length >= minLength) {
      search(query);
    }
  }, [query, minLength, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
    refetch,
    hasResults: results !== null && results.total_count > 0,
  };
}
