import { tool } from "ai";
import { z } from "zod";
import { agentFetch, AgentToolError } from "../lib/api-client";
import type { CompressedSearchResult } from "../types";

// ---------------------------------------------------------------------------
// Match-tier priority (lower = better) and label-similarity scoring
// ---------------------------------------------------------------------------

const TIER_PRIORITY: Record<string, number> = {
  NameExact: 0,
  SynonymExact: 1,
  NameFuzzy: 2,
  SynonymFuzzy: 3,
};

/** Normalise a string for comparison: lowercase, strip possessives & punctuation. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[''`]/g, "").replace(/s\b/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Score how closely `label` matches `query` (lower = better match).
 * 0 = exact normalised match, then penalise by extra length.
 */
function labelSimilarity(label: string, query: string): number {
  const nl = norm(label);
  const nq = norm(query);
  if (nl === nq) return 0;                       // exact after normalisation
  if (nl.startsWith(nq)) return nl.length - nq.length; // prefix match, penalise extra chars
  if (nl.includes(nq)) return 100 + nl.length;   // substring match
  return 1000 + nl.length;                       // no direct match
}

// Types that are actually searchable via ES (from GET /graph/schema nodeTypes)
const SEARCHABLE_TYPES = [
  "Gene", "Disease", "Drug", "Variant", "Pathway",
  "Phenotype", "Study", "GOTerm", "SideEffect",
  "Metabolite", "Tissue", "ProteinDomain", "Entity",
  "CellType", "Signal", "cCRE",
] as const;

const SEARCHABLE_SET = new Set<string>(SEARCHABLE_TYPES);

const searchableTypeEnum = z.enum(SEARCHABLE_TYPES);

export const searchEntities = tool({
  description:
    `Resolve an entity name to a typed ID. Search by name or keyword.
USAGE: Call with just a query to search all types, or pass 1-2 types to narrow results.
EXAMPLES:
  searchEntities({ query: "metformin" })  → finds Drug:CHEMBL1431
  searchEntities({ query: "breast cancer", types: ["Disease"] })  → finds Disease:MONDO_0007254
  searchEntities({ query: "BRCA1", types: ["Gene"] })  → finds Gene:ENSG00000012048
DO NOT pass all types — omit types to search everything. Only filter when you know the expected type.
Cohorts are NOT graph entities — never search for cohort IDs here.`,
  inputSchema: z.object({
    query: z.string().describe("Search term (e.g., 'BRCA1', 'breast cancer', 'aspirin')"),
    types: z
      .array(searchableTypeEnum)
      .optional()
      .describe("Narrow to 1-2 types. Omit to search all types (recommended)."),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Max results (default 5, max 20). Usually 5 is enough."),
  }),
  execute: async ({ query, types, limit }): Promise<CompressedSearchResult[] | { error: boolean; message: string; hint?: string }> => {
    if (!query.trim()) {
      return { error: true, message: "Empty search query", hint: "Provide a search term." };
    }

    const cap = Math.min(limit ?? 5, 20);

    // Safety net: strip any types that slipped past validation
    const validTypes = types?.filter((t) => SEARCHABLE_SET.has(t));

    try {
      const params = new URLSearchParams();
      params.set("q", query);
      // Fetch more than needed so we have room to re-rank
      params.set("limit", String(Math.min(cap * 2, 20)));
      if (validTypes?.length) {
        params.set("types", validTypes.join(","));
      }

      const data = await agentFetch<{
        results: Array<{
          entity: { type: string; id: string; label: string; subtitle?: string };
          match: { confidence: number; matchTier?: string; matchReason?: string };
        }>;
        totalCount: number;
      }>(`/graph/search?${params.toString()}`);

      const mapped = (data.results ?? []).map(
        (r): CompressedSearchResult & { _tierPri: number; _labelSim: number } => ({
          type: r.entity.type,
          id: r.entity.id,
          label: r.entity.label,
          subtitle: r.entity.subtitle,
          score: r.match.confidence,
          matchTier: r.match.matchTier,
          _tierPri: TIER_PRIORITY[r.match.matchTier ?? ""] ?? 99,
          _labelSim: labelSimilarity(r.entity.label, query),
        }),
      );

      // Sort: confidence desc → tier priority asc → label similarity asc
      mapped.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a._tierPri !== b._tierPri) return a._tierPri - b._tierPri;
        return a._labelSim - b._labelSim;
      });

      // Strip internal fields and apply user's limit
      const results: CompressedSearchResult[] = mapped.slice(0, cap).map(
        ({ _tierPri, _labelSim, ...rest }) => rest,
      );

      if (results.length === 0) {
        return {
          error: true,
          message: `No entities found for "${query}"`,
          hint: "Try a different spelling, synonym, or broader search term.",
        };
      }

      return results;
    } catch (err) {
      if (err instanceof AgentToolError) return err.toToolResult();
      throw err;
    }
  },
});
