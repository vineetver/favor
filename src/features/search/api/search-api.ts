import type {
  TypeaheadParams,
  TypeaheadResponse,
  SearchParams,
  SearchResults,
} from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Fetch typeahead suggestions for fast autocomplete
 * Optimized for low latency (~15ms target)
 */
export async function fetchTypeahead(params: TypeaheadParams): Promise<TypeaheadResponse> {
  const searchParams = new URLSearchParams();

  searchParams.append('q', params.q);

  if (params.types !== undefined) {
    searchParams.append('types', params.types);
  }

  if (params.limit !== undefined) {
    searchParams.append('limit', params.limit.toString());
  }

  if (params.include_links !== undefined) {
    searchParams.append('include_links', params.include_links.toString());
  }

  if (params.include_preview !== undefined) {
    searchParams.append('include_preview', params.include_preview.toString());
  }

  const response = await fetch(`${API_BASE_URL}/typeahead?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    // Don't cache typeahead for real-time feel
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Typeahead request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Text search across all entity types or pivot search for related entities
 */
export async function fetchSearch(params: SearchParams): Promise<SearchResults> {
  const searchParams = new URLSearchParams();

  if (params.q !== undefined) {
    searchParams.append('q', params.q);
  }

  if (params.types !== undefined) {
    searchParams.append('types', params.types);
  }

  if (params.limit !== undefined) {
    searchParams.append('limit', params.limit.toString());
  }

  if (params.expand !== undefined) {
    searchParams.append('expand', params.expand.toString());
  }

  if (params.cursor !== undefined) {
    searchParams.append('cursor', params.cursor);
  }

  if (params.include !== undefined) {
    searchParams.append('include', params.include);
  }

  if (params.debug !== undefined) {
    searchParams.append('debug', params.debug.toString());
  }

  if (params.anchor_id !== undefined) {
    searchParams.append('anchor_id', params.anchor_id);
  }

  if (params.anchor_type !== undefined) {
    searchParams.append('anchor_type', params.anchor_type);
  }

  const response = await fetch(`${API_BASE_URL}/search?${searchParams.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
    // Cache search results for 5 minutes
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.statusText}`);
  }

  return response.json();
}
