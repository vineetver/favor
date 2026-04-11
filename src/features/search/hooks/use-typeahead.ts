"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTypeahead, fetchVariantPrefix } from "../api/search-api";
import type {
  EntityType,
  TypeaheadResponse,
  TypeaheadSuggestion,
  VariantPrefixResponse,
} from "../types/api";
import { parseQuery } from "../utils/query-parser";

/** Convert RocksDB prefix results → TypeaheadSuggestion format */
function prefixToSuggestions(
  prefix: VariantPrefixResponse,
): TypeaheadSuggestion[] {
  const suggestions: TypeaheadSuggestion[] = [];

  // Direct variant results (full/partial VCF lookups) — have annotation data
  for (const r of prefix.results) {
    const desc: string[] = [];
    if (r.rsid) desc.push(r.rsid);
    if (r.gene) desc.push(r.gene);
    if (r.caddPhred != null) desc.push(`CADD: ${r.caddPhred.toFixed(1)}`);
    if (r.gnomadAf != null)
      desc.push(`gnomAD AF: ${r.gnomadAf.toPrecision(3)}`);

    suggestions.push({
      id: r.vcf,
      display_name: r.vcf,
      entity_type: "variants",
      description: desc.join(" · ") || undefined,
      match_tier: "Prefix",
      match_reason: "prefix",
    });
  }

  // rsID prefix matches — show rsID as name, VCF as description
  if (prefix.rsid_matches) {
    for (const m of prefix.rsid_matches) {
      for (const vcf of m.variant_vcfs) {
        suggestions.push({
          id: vcf,
          display_name: m.rsid,
          entity_type: "variants",
          description: vcf,
          match_tier: "Prefix",
          match_reason: "prefix",
        });
      }
    }
  }

  return suggestions;
}

/** Merge RocksDB prefix results into ES typeahead response. RocksDB first, deduplicated. */
function mergeVariantPrefix(
  typeahead: TypeaheadResponse,
  prefix: VariantPrefixResponse,
): TypeaheadResponse {
  const rocksSuggestions = prefixToSuggestions(prefix);
  if (rocksSuggestions.length === 0) return typeahead;

  const rocksIds = new Set(rocksSuggestions.map((s) => s.id));
  const newGroups = [...typeahead.groups];
  const variantIdx = newGroups.findIndex((g) => g.entity_type === "variants");

  if (variantIdx >= 0) {
    const dedupedES = newGroups[variantIdx].suggestions.filter(
      (s) => !rocksIds.has(s.id),
    );
    newGroups[variantIdx] = {
      entity_type: "variants",
      suggestions: [...rocksSuggestions, ...dedupedES],
    };
  } else {
    newGroups.unshift({
      entity_type: "variants",
      suggestions: rocksSuggestions,
    });
  }

  return {
    groups: newGroups,
    exact_present: typeahead.exact_present || rocksSuggestions.length > 0,
    total_count: typeahead.total_count + rocksSuggestions.length,
  };
}

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
      const signal = abortControllerRef.current.signal;

      // Detect variant-shaped queries for parallel RocksDB lookup
      const parsed = parseQuery(searchQuery);
      const isVariantQuery =
        parsed.type === "variant_vcf" || parsed.type === "variant_rsid";

      try {
        // Fire ES typeahead + RocksDB prefix in parallel for variant queries
        const [typeaheadRes, prefixRes] = await Promise.all([
          fetchTypeahead({
            q: searchQuery,
            types: types?.join(","),
            limit,
            include_links: includeLinks,
            signal,
          }),
          isVariantQuery
            ? fetchVariantPrefix({ q: searchQuery, limit: 10, signal }).catch(
                () => null,
              )
            : null,
        ]);

        // Merge RocksDB results into typeahead response
        const response = prefixRes
          ? mergeVariantPrefix(typeaheadRes, prefixRes)
          : typeaheadRes;

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
    [minLength, types, limit, includeLinks],
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
