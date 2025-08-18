interface ElasticsearchHit {
  _index: string;
  _id: string;
  _score: number;
  _source: {
    value: string;
    data?: {
      // For rsid/variants
      snp_type?: string;
      variant_vcf?: string;
      clnsig?: string;
      genecode_category?: string;
      genecode_exonic_type?: string;
      // For genes
      chromosome?: string;
      position?: string;
      [key: string]: unknown;
    };
  };
}

interface ElasticsearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: ElasticsearchHit[];
  };
}

interface SearchSuggestion {
  id: string;
  value: string;
  data?: {
    // For rsid
    snp_type?: string;
    variant_vcf?: string;
    clnsig?: string;
    genecode_category?: string;
    genecode_exonic_type?: string;
    // For genes
    chromosome?: string;
    position?: string;
    [key: string]: unknown;
  };
  type: string; // Inferred from value or set to 'gene'
  score: number;
}

export async function searchSuggestions(
  q: string,
  controller?: AbortController,
): Promise<SearchSuggestion[]> {
  if (!q || q.length < 3) return [];

  const url = `/api/search/suggestions?q=${encodeURIComponent(q.trim())}`;

  try {
    const response = await fetch(url, {
      signal: controller?.signal,
    });

    if (!response.ok) {
      console.warn(`Suggestions API error: ${response.status}`);
      return [];
    }

    const suggestions = (await response.json()) as SearchSuggestion[];
    return suggestions;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return [];
    }

    console.warn("Failed to fetch suggestions:", error);
    return [];
  }
}

export type { SearchSuggestion, ElasticsearchResponse, ElasticsearchHit };
