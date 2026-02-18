import { tool } from "ai";
import { z } from "zod";
import { agentFetch } from "../lib/api-client";
import type { CompressedSearchResult } from "../types";

export const searchEntities = tool({
  description:
    "Search the FAVOR knowledge graph for entities by name or keyword. Returns matching genes, diseases, drugs, variants, pathways, traits, phenotypes, and more. Always use this first to resolve entity names to IDs before calling other tools.",
  inputSchema: z.object({
    query: z.string().describe("Search term (e.g., 'BRCA1', 'breast cancer', 'aspirin')"),
    types: z
      .array(z.string())
      .optional()
      .describe("Filter by entity types (e.g., ['Gene', 'Disease'])"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Max results to return (default 10, max 20)"),
  }),
  execute: async ({ query, types, limit }): Promise<CompressedSearchResult[] | string> => {
    if (!query.trim()) {
      return "Please provide a search term.";
    }

    const params = new URLSearchParams();
    params.set("q", query);
    params.set("limit", String(Math.min(limit ?? 10, 20)));
    if (types?.length) {
      params.set("types", types.join(","));
    }

    const data = await agentFetch<{
      results: Array<{
        entity: { type: string; id: string; label: string; subtitle?: string };
        match: { confidence: number; matchTier?: string; matchReason?: string };
      }>;
      totalCount: number;
    }>(`/graph/search?${params.toString()}`);

    return (data.results ?? []).slice(0, 10).map(
      (r): CompressedSearchResult => ({
        type: r.entity.type,
        id: r.entity.id,
        label: r.entity.label,
        subtitle: r.entity.subtitle,
        score: r.match.confidence,
        matchTier: r.match.matchTier,
      }),
    );
  },
});
