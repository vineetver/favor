import type {
  SearchParams,
  SearchResults,
  TypeaheadParams,
  TypeaheadResponse,
  VariantPrefixResponse,
} from "../types/api";

import { API_BASE } from "@/config/api";

/**
 * Fetch typeahead suggestions for fast autocomplete
 * Optimized for low latency (~15ms target)
 */
export async function fetchTypeahead(
  params: TypeaheadParams,
): Promise<TypeaheadResponse> {
  const searchParams = new URLSearchParams();

  searchParams.append("q", params.q);

  if (params.types !== undefined) {
    searchParams.append("types", params.types);
  }

  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }

  if (params.include_links !== undefined) {
    searchParams.append("include_links", params.include_links.toString());
  }

  const response = await fetch(
    `${API_BASE}/typeahead?${searchParams.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      // Don't cache typeahead for real-time feel
      cache: "no-store",
      // Pass abort signal to cancel in-flight requests
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Typeahead request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch variant prefix matches from RocksDB (covers all 8.9B variants)
 * Fires in parallel with typeahead for variant-shaped queries
 */
export async function fetchVariantPrefix(params: {
  q: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<VariantPrefixResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append("q", params.q);
  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }

  const response = await fetch(
    `${API_BASE}/variants/prefix?${searchParams.toString()}`,
    {
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Variant prefix failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Text search across all entity types or pivot search for related entities
 */
export async function fetchSearch(
  params: SearchParams,
): Promise<SearchResults> {
  const searchParams = new URLSearchParams();

  if (params.q !== undefined) {
    searchParams.append("q", params.q);
  }

  if (params.types !== undefined) {
    searchParams.append("types", params.types);
  }

  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }

  if (params.expand !== undefined) {
    searchParams.append("expand", params.expand.toString());
  }

  if (params.cursor !== undefined) {
    searchParams.append("cursor", params.cursor);
  }

  if (params.include !== undefined) {
    searchParams.append("include", params.include);
  }

  if (params.debug !== undefined) {
    searchParams.append("debug", params.debug.toString());
  }

  if (params.anchor_id !== undefined) {
    searchParams.append("anchor_id", params.anchor_id);
  }

  if (params.anchor_type !== undefined) {
    searchParams.append("anchor_type", params.anchor_type);
  }

  if (params.include_links !== undefined) {
    searchParams.append("include_links", params.include_links.toString());
  }

  const response = await fetch(
    `${API_BASE}/pivot?${searchParams.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      // Cache search results for 5 minutes
      next: { revalidate: 300 },
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Pivot expansion - fetch related entities for a selected anchor
 * Used after user selects an entity to show what's connected to it
 * Returns TypeaheadResponse format (groups with suggestions)
 */
export async function fetchPivotExpansion(params: {
  anchor_id: string;
  anchor_type: string;
  types?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<TypeaheadResponse> {
  const searchParams = new URLSearchParams();

  searchParams.append("anchor_id", params.anchor_id);
  searchParams.append("anchor_type", params.anchor_type);
  searchParams.append("expand", "true");
  searchParams.append("include_links", "true");

  if (params.types !== undefined) {
    searchParams.append("types", params.types);
  }

  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }

  const response = await fetch(
    `${API_BASE}/pivot?${searchParams.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
      signal: params.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Pivot request failed: ${response.statusText}`);
  }

  return response.json();
}
