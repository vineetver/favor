"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPivotExpansion } from "../api/search-api";
import type { EntityType, TypeaheadResponse } from "../types/api";

interface UsePivotExpansionOptions {
  /**
   * Entity types to include in pivot results (default: all)
   */
  types?: EntityType[];

  /**
   * Max results per type (default: 5)
   */
  limit?: number;

  /**
   * Callback when pivot results are fetched
   */
  onResults?: (results: TypeaheadResponse) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

interface AnchorEntity {
  id: string;
  type: EntityType;
}

export function usePivotExpansion(options: UsePivotExpansionOptions = {}) {
  const { types, limit = 5, onResults, onError } = options;

  const [anchor, setAnchor] = useState<AnchorEntity | null>(null);
  const [results, setResults] = useState<TypeaheadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Store callbacks in refs to prevent unnecessary re-fetches
  const onResultsRef = useRef(onResults);
  const onErrorRef = useRef(onError);
  onResultsRef.current = onResults;
  onErrorRef.current = onError;

  const fetchPivot = useCallback(
    async (anchorEntity: AnchorEntity) => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Increment request ID for this new request
      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      // Clear previous results immediately to prevent stale data flash
      setResults(null);
      setIsLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetchPivotExpansion({
          anchor_id: anchorEntity.id,
          anchor_type: anchorEntity.type,
          types: types?.join(","),
          limit,
          signal: abortControllerRef.current.signal,
        });

        // Only update if this is still the latest request
        if (currentRequestId === requestIdRef.current) {
          setResults(response);
          onResultsRef.current?.(response);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Pivot fetch failed");

        // Don't set error for aborted requests
        if (error.name !== "AbortError") {
          if (currentRequestId === requestIdRef.current) {
            setError(error);
            onErrorRef.current?.(error);
          }
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
        abortControllerRef.current = null;
      }
    },
    [types, limit],
  );

  // Fetch pivot when anchor changes
  useEffect(() => {
    if (anchor) {
      fetchPivot(anchor);
    } else {
      setResults(null);
      setError(null);
    }
  }, [anchor, fetchPivot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clear = useCallback(() => {
    setAnchor(null);
    setResults(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    anchor,
    setAnchor,
    results,
    isLoading,
    error,
    clear,
    hasResults: results !== null && results.total_count > 0,
  };
}
