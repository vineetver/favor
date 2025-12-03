"use server";

import { getElasticsearchClient } from "@/lib/elasticsearch/client";
import { buildAutocompleteQuery } from "@/lib/elasticsearch/queries";
import { cacheService } from "@/lib/cache/cache-service";
import { rateLimit } from "@/lib/rate-limit/middleware";
import { RATE_LIMITS } from "@/lib/rate-limit/config";
import { detectQueryType } from "@/features/search/lib/query-parser/parser";
import type { SuggestionResult } from "./types";

const INDEX_NAME = "autocomplete_combined";
const CACHE_TTL = 300;

export async function getSuggestions(
  query: string,
): Promise<SuggestionResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    await rateLimit(RATE_LIMITS.SEARCH_SUGGESTIONS);

    const cacheKey = `suggestions:${query.toLowerCase()}`;

    return await cacheService.wrap(
      cacheKey,
      async () => {
        const client = getElasticsearchClient();

        const response = await client.search({
          index: INDEX_NAME,
          query: buildAutocompleteQuery(query),
          _source: ["value", "data"],
          size: 10,
        });

        const hits = response.hits.hits;

        return hits.map((hit) => {
          const source = hit._source as {
            value: string;
            data?: Record<string, unknown>;
          };

          return {
            id: hit._id as string,
            value: source.value,
            label: source.value,
            type: detectQueryType(source.value),
            data: source.data,
          };
        });
      },
      { ttl: CACHE_TTL },
    );
  } catch (error) {
    return [];
  }
}
