/**
 * SeedRef resolution — resolve fuzzy labels, artifact refs, and cohort refs
 * into concrete { type, id, label } entities.
 */

import { agentFetch, AgentToolError } from "../../lib/api-client";
import type { SeedRef, EntityRef } from "./types";

interface ResolveResult {
  results: Array<{
    query: string;
    status: string; // API returns lowercase "matched" / "not_found"
    entity?: { type: string; id: string; label: string; subtitle?: string };
    confidence?: number;
    matchTier?: string;
  }>;
}

interface SearchResult {
  results: Array<{
    entity: { type: string; id: string; label: string; subtitle?: string };
    match?: { confidence: number; matchTier?: string };
  }>;
}

/** Confidence threshold — below this we fall back to search */
const MIN_CONFIDENCE = 0.9;

/**
 * Normalize a fuzzy label for better resolve matching.
 * Strips possessive forms ("Alzheimer's" → "Alzheimer") which cause
 * the resolve endpoint to match subtypes via synonyms instead of
 * the canonical parent entity.
 */
function normalizeLabel(label: string): string {
  return label
    .replace(/\u2019s\b/g, "") // curly apostrophe possessive
    .replace(/'s\b/g, "")      // straight apostrophe possessive
    .trim();
}

/**
 * Resolve an array of SeedRefs into concrete EntityRefs.
 * Supports exact, fuzzy, artifact-based, and cohort-based seeds.
 */
export async function resolveSeeds(
  refs: SeedRef[],
  resolvedCache?: Record<string, EntityRef>,
): Promise<EntityRef[]> {
  const resolved: EntityRef[] = [];

  // Batch fuzzy labels for a single API call
  const fuzzyLabels: Array<{ index: number; label: string }> = [];
  const exactRefs: Array<{ index: number; ref: { type: string; id: string } }> = [];

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];

    if ("type" in ref && "id" in ref) {
      // Exact ID — check cache first
      const cacheKey = `${ref.type}:${ref.id}`;
      const cached = resolvedCache?.[cacheKey];
      if (cached) {
        resolved.push(cached);
      } else {
        exactRefs.push({ index: i, ref: ref as { type: string; id: string } });
      }
    } else if ("label" in ref) {
      const label = (ref as { label: string }).label;
      // Check cache by label too
      const cached = resolvedCache?.[label];
      if (cached) {
        resolved.push(cached);
      } else {
        fuzzyLabels.push({ index: i, label });
      }
    } else if ("from_artifact" in ref) {
      const artRef = ref as { from_artifact: number; field?: string };
      const entities = await extractEntitiesFromArtifact(artRef.from_artifact, artRef.field);
      resolved.push(...entities);
    } else if ("from_cohort" in ref) {
      const cohortRef = ref as { from_cohort: string; top?: number };
      const entities = await extractEntitiesFromCohort(cohortRef.from_cohort, cohortRef.top);
      resolved.push(...entities);
    }
  }

  // Resolve all fuzzy + exact refs in a single batch call
  const queries: string[] = [];
  const queryMeta: Array<{ type: "fuzzy" | "exact"; originalLabel?: string }> = [];

  for (const { label } of fuzzyLabels) {
    queries.push(normalizeLabel(label));
    queryMeta.push({ type: "fuzzy", originalLabel: label });
  }
  for (const { ref } of exactRefs) {
    queries.push(`${ref.type}:${ref.id}`);
    queryMeta.push({ type: "exact" });
  }

  if (queries.length > 0) {
    try {
      const result = await agentFetch<ResolveResult>("/graph/resolve", {
        method: "POST",
        body: { queries },
      });

      // Track low-confidence fuzzy results for search fallback
      const lowConfidenceLabels: Array<{ label: string; resolvedIndex: number }> = [];

      for (let i = 0; i < result.results.length; i++) {
        const r = result.results[i];
        if (r.status.toLowerCase() === "matched" && r.entity) {
          const confidence = r.confidence ?? 1.0;
          const meta = queryMeta[i];

          if (meta?.type === "fuzzy" && confidence < MIN_CONFIDENCE) {
            // Low confidence fuzzy match — mark for search fallback
            lowConfidenceLabels.push({
              label: meta.originalLabel ?? r.query,
              resolvedIndex: resolved.length,
            });
          }

          resolved.push({
            type: r.entity.type,
            id: r.entity.id,
            label: r.entity.label,
            subtitle: r.entity.subtitle,
          });
        }
      }

      // Search fallback for low-confidence fuzzy matches
      if (lowConfidenceLabels.length > 0) {
        await improveLowConfidenceMatches(resolved, lowConfidenceLabels);
      }
    } catch (err) {
      // Partial resolution is OK — return what we have
      const detail = err instanceof AgentToolError ? err.detail : (err instanceof Error ? err.message : String(err));
      console.error("[resolve-seeds] Batch resolve failed:", detail);
    }
  }

  return resolved;
}

/**
 * For low-confidence resolve results, try a search-based approach.
 * If search returns a higher-confidence match, replace in-place.
 */
async function improveLowConfidenceMatches(
  resolved: EntityRef[],
  lowConfidence: Array<{ label: string; resolvedIndex: number }>,
): Promise<void> {
  for (const { label, resolvedIndex } of lowConfidence) {
    try {
      const normalized = normalizeLabel(label);
      const searchResult = await agentFetch<SearchResult>(
        `/graph/search?q=${encodeURIComponent(normalized)}&limit=1`,
      );

      const top = searchResult.results?.[0];
      if (!top?.entity) continue;

      const searchConf = top.match?.confidence ?? 0;
      if (searchConf >= MIN_CONFIDENCE) {
        // Search found a better match — replace the resolve result
        resolved[resolvedIndex] = {
          type: top.entity.type,
          id: top.entity.id,
          label: top.entity.label,
          subtitle: top.entity.subtitle,
        };
      }
    } catch {
      // Non-critical — keep the resolve result
    }
  }
}

async function extractEntitiesFromArtifact(
  artifactId: number,
  field?: string,
): Promise<EntityRef[]> {
  try {
    const artifact = await agentFetch<{
      data: Record<string, unknown>;
    }>(`/agent/artifacts/${artifactId}?limit=20`);

    const data = artifact.data;
    const source = field ? data[field] : data;

    if (Array.isArray(source)) {
      return source
        .filter(
          (item): item is { type: string; id: string; label: string } =>
            item && typeof item.type === "string" && typeof item.id === "string",
        )
        .slice(0, 10)
        .map((item) => ({
          type: item.type,
          id: item.id,
          label: item.label ?? item.id,
        }));
    }

    return [];
  } catch {
    return [];
  }
}

async function extractEntitiesFromCohort(
  cohortId: string,
  top?: number,
): Promise<EntityRef[]> {
  try {
    // Get top genes from cohort by groupby
    const result = await agentFetch<{
      buckets?: Array<{ key: string; count: number }>;
    }>(`/cohorts/${encodeURIComponent(cohortId)}/groupby`, {
      method: "POST",
      body: { group_by: "gene", limit: top ?? 5 },
    });

    if (!result.buckets) return [];

    // Resolve gene names to entities
    const geneNames = result.buckets.map((b) => b.key).filter(Boolean);
    if (geneNames.length === 0) return [];

    const resolved = await agentFetch<ResolveResult>("/graph/resolve", {
      method: "POST",
      body: { queries: geneNames },
    });

    return resolved.results
      .filter((r) => r.status.toLowerCase() === "matched" && r.entity)
      .map((r) => ({
        type: r.entity!.type,
        id: r.entity!.id,
        label: r.entity!.label,
      }));
  } catch {
    return [];
  }
}
