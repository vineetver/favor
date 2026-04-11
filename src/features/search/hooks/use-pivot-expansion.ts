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
   * Expanded limit when user clicks "Show more" (default: 50)
   */
  expandedLimit?: number;

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
  const { types, limit = 5, expandedLimit = 50, onResults, onError } = options;

  const [anchor, setAnchor] = useState<AnchorEntity | null>(null);
  const [results, setResults] = useState<TypeaheadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<EntityType>>(
    new Set(),
  );
  const [expandingType, setExpandingType] = useState<EntityType | null>(null);

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
        const error =
          err instanceof Error ? err : new Error("Pivot fetch failed");

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
      // Reset expanded types when anchor changes
      setExpandedTypes(new Set());
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

  // Fetch more results for a specific entity type
  const fetchMoreForType = useCallback(
    async (entityType: EntityType) => {
      if (!anchor || expandedTypes.has(entityType)) return;

      setExpandingType(entityType);

      try {
        const response = await fetchPivotExpansion({
          anchor_id: anchor.id,
          anchor_type: anchor.type,
          types: entityType,
          limit: expandedLimit,
        });

        // Merge expanded results into existing results
        setResults((prev) => {
          if (!prev) return response;

          // Replace the group for this entity type with the expanded results
          const updatedGroups = prev.groups.map((group) => {
            if (group.entity_type === entityType) {
              const expandedGroup = response.groups.find(
                (g) => g.entity_type === entityType,
              );
              return expandedGroup || group;
            }
            return group;
          });

          // Recalculate total count
          const newTotalCount = updatedGroups.reduce(
            (sum, g) => sum + g.suggestions.length,
            0,
          );

          return {
            ...prev,
            groups: updatedGroups,
            total_count: newTotalCount,
          };
        });

        setExpandedTypes((prev) => new Set([...prev, entityType]));
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Fetch more failed");
        if (error.name !== "AbortError") {
          console.error("Failed to fetch more for type:", entityType, error);
        }
      } finally {
        setExpandingType(null);
      }
    },
    [anchor, expandedTypes, expandedLimit],
  );

  const clear = useCallback(() => {
    setAnchor(null);
    setResults(null);
    setError(null);
    setIsLoading(false);
    setExpandedTypes(new Set());
    setExpandingType(null);
  }, []);

  return {
    anchor,
    setAnchor,
    results,
    isLoading,
    error,
    clear,
    hasResults: results !== null && results.total_count > 0,
    expandedTypes,
    expandingType,
    fetchMoreForType,
  };
}
