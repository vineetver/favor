'use client';

import { useState, useCallback } from 'react';
import { fetchSearch } from '../api/search-api';
import type { SearchResults, EntityType, SearchParams } from '../types/api';

interface UsePivotSearchOptions {
  /**
   * Entity types to return (default: all)
   */
  types?: EntityType[];

  /**
   * Max results per type (default: 10)
   */
  limit?: number;

  /**
   * Enable pivot expansion (default: true)
   */
  expand?: boolean;

  /**
   * Include additional fields (default: 'preview,links,highlights,description')
   */
  include?: string;

  /**
   * Enable debug information (default: false)
   */
  debug?: boolean;

  /**
   * Callback when search completes
   */
  onResults?: (results: SearchResults) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

export function usePivotSearch(options: UsePivotSearchOptions = {}) {
  const {
    types,
    limit = 10,
    expand = true,
    include = 'preview,links,highlights,description',
    debug = false,
    onResults,
    onError,
  } = options;

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Perform a text search
   */
  const searchText = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const params: SearchParams = {
          q: query,
          types: types?.join(','),
          limit,
          expand,
          include,
          debug,
        };

        const response = await fetchSearch(params);
        setResults(response);
        onResults?.(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Search failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [types, limit, expand, include, debug, onResults, onError]
  );

  /**
   * Perform a pivot search (find entities related to an anchor)
   */
  const searchPivot = useCallback(
    async (anchorId: string, anchorType: EntityType) => {
      setIsLoading(true);
      setError(null);

      try {
        const params: SearchParams = {
          anchor_id: anchorId,
          anchor_type: anchorType,
          types: types?.join(','),
          limit,
          expand,
          include,
          debug,
        };

        const response = await fetchSearch(params);
        setResults(response);
        onResults?.(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Pivot search failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [types, limit, expand, include, debug, onResults, onError]
  );

  /**
   * Load more results using pagination cursor
   */
  const loadMore = useCallback(
    async (cursor: string) => {
      if (!results) return;

      setIsLoading(true);
      setError(null);

      try {
        const params: SearchParams = {
          cursor,
          types: types?.join(','),
          limit,
          expand,
          include,
          debug,
        };

        // Add query or pivot params from current results
        if (results.query) {
          params.q = results.query;
        } else if (results.anchor_id && results.anchor_type) {
          params.anchor_id = results.anchor_id;
          params.anchor_type = results.anchor_type;
        }

        const response = await fetchSearch(params);

        // Merge results
        setResults({
          ...response,
          results: {
            genes: [...(results.results.genes || []), ...(response.results.genes || [])],
            diseases: [
              ...(results.results.diseases || []),
              ...(response.results.diseases || []),
            ],
            drugs: [...(results.results.drugs || []), ...(response.results.drugs || [])],
            pathways: [
              ...(results.results.pathways || []),
              ...(response.results.pathways || []),
            ],
            variants: [
              ...(results.results.variants || []),
              ...(response.results.variants || []),
            ],
          },
        });

        onResults?.(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Load more failed');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [results, types, limit, expand, include, debug, onResults, onError]
  );

  const clear = useCallback(() => {
    setResults(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    results,
    isLoading,
    error,
    searchText,
    searchPivot,
    loadMore,
    clear,
    hasResults: results !== null && results.total > 0,
    hasMore: results?.cursor !== undefined,
  };
}
