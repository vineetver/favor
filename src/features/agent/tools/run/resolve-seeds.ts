/**
 * SeedRef resolution — resolve fuzzy labels, artifact refs, and cohort refs
 * into concrete { type, id, label } entities.
 *
 * Phase 4: Returns match-quality + candidates for disambiguation.
 * Phase 5: TraceCollector for observability.
 */

import { AgentToolError, agentFetch } from "../../lib/api-client";
import type { Candidate } from "./run-result";
import type { EntityRef, SeedRef } from "./types";

const MAX_SUBTITLE_LENGTH = 150;
function trimSubtitle(s?: string): string | undefined {
  if (!s) return s;
  return s.length <= MAX_SUBTITLE_LENGTH
    ? s
    : `${s.slice(0, MAX_SUBTITLE_LENGTH).trimEnd()}…`;
}

interface ResolveResultItem {
  query: string;
  status: string;
  entity?: { type: string; id: string; label: string; subtitle?: string };
  confidence?: number;
  matchTier?: string;
}

interface SearchResultItem {
  entity: { type: string; id: string; label: string; subtitle?: string };
  match?: { confidence: number; matchTier?: string };
}

/** Confidence threshold — below this we fall back to search */
const MIN_CONFIDENCE = 0.9;

/** Per-seed resolution metadata */
export interface SeedResolution {
  entity: EntityRef;
  confidence: number;
  strategy: "exact" | "resolve" | "search_fallback" | "artifact" | "cohort";
  low_confidence: boolean;
  fallback_used: boolean;
  candidates?: Candidate[];
}

/**
 * Normalize a fuzzy label for better resolve matching.
 */
function normalizeLabel(label: string): string {
  return label
    .replace(/\u2019s\b/g, "")
    .replace(/'s\b/g, "")
    .trim();
}

/**
 * Resolve an array of SeedRefs into concrete EntityRefs.
 * Returns resolutions with metadata (confidence, strategy, candidates).
 */
export interface ResolveResult {
  resolutions: SeedResolution[];
  unresolved: string[];
}

export async function resolveSeedsWithMeta(
  refs: SeedRef[],
  resolvedCache?: Record<string, EntityRef>,
): Promise<ResolveResult> {
  const resolutions: SeedResolution[] = [];
  const unresolvedLabels: string[] = [];

  // Batch fuzzy labels for a single API call
  const fuzzyLabels: Array<{ index: number; label: string }> = [];
  const exactRefs: Array<{ index: number; ref: { type: string; id: string } }> =
    [];
  // Track which resolution index maps to which seed
  const _resolutionIndices: Array<{
    seedIndex: number;
    resolutionIndex: number;
  }> = [];

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];

    if ("type" in ref && "id" in ref) {
      const cacheKey = `${ref.type}:${ref.id}`;
      const cached = resolvedCache?.[cacheKey];
      if (cached) {
        resolutions.push({
          entity: cached,
          confidence: 1.0,
          strategy: "exact",
          low_confidence: false,
          fallback_used: false,
        });
      } else {
        exactRefs.push({ index: i, ref: ref as { type: string; id: string } });
      }
    } else if ("label" in ref) {
      const label = (ref as { label: string }).label;
      const cached = resolvedCache?.[label];
      if (cached) {
        resolutions.push({
          entity: cached,
          confidence: 1.0,
          strategy: "exact",
          low_confidence: false,
          fallback_used: false,
        });
      } else {
        fuzzyLabels.push({ index: i, label });
      }
    } else if ("from_artifact" in ref) {
      const artRef = ref as { from_artifact: number; field?: string };
      const entities = await extractEntitiesFromArtifact(
        artRef.from_artifact,
        artRef.field,
      );
      for (const entity of entities) {
        resolutions.push({
          entity,
          confidence: 1.0,
          strategy: "artifact",
          low_confidence: false,
          fallback_used: false,
        });
      }
    } else if ("from_cohort" in ref) {
      const cohortRef = ref as { from_cohort: string; top?: number };
      const entities = await extractEntitiesFromCohort(
        cohortRef.from_cohort,
        cohortRef.top,
      );
      for (const entity of entities) {
        resolutions.push({
          entity,
          confidence: 0.95,
          strategy: "cohort",
          low_confidence: false,
          fallback_used: false,
        });
      }
    }
  }

  // Resolve all fuzzy + exact refs in a single batch call
  const queries: string[] = [];
  const queryMeta: Array<{ type: "fuzzy" | "exact"; originalLabel?: string }> =
    [];

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
      const resp = await agentFetch<{ data: { results: ResolveResultItem[] } }>(
        "/graph/resolve",
        {
          method: "POST",
          body: { queries },
        },
      );
      const resolveResults = resp.data?.results ?? [];

      const lowConfidenceLabels: Array<{
        label: string;
        resolvedIndex: number;
      }> = [];

      for (let i = 0; i < resolveResults.length; i++) {
        const r = resolveResults[i];
        if (r.status.toLowerCase() === "matched" && r.entity) {
          const confidence = r.confidence ?? 1.0;
          const meta = queryMeta[i];
          const isLowConfidence =
            meta?.type === "fuzzy" && confidence < MIN_CONFIDENCE;

          if (isLowConfidence) {
            lowConfidenceLabels.push({
              label: meta.originalLabel ?? r.query,
              resolvedIndex: resolutions.length,
            });
          }

          resolutions.push({
            entity: {
              type: r.entity.type,
              id: r.entity.id,
              label: r.entity.label,
              subtitle: trimSubtitle(r.entity.subtitle),
            },
            confidence,
            strategy: meta?.type === "exact" ? "exact" : "resolve",
            low_confidence: isLowConfidence,
            fallback_used: false,
          });
        } else {
          // Not found — attempt search fallback for fuzzy; warn for exact
          const meta = queryMeta[i];
          if (meta?.type === "fuzzy") {
            const label = meta.originalLabel ?? r.query;
            const searchRes = await searchFallback(label);
            if (searchRes) {
              resolutions.push(searchRes);
            } else {
              console.warn(
                `[resolve-seeds] Fuzzy label "${label}" unresolved — dropped from seeds`,
              );
              unresolvedLabels.push(label);
            }
          } else if (meta?.type === "exact") {
            console.warn(
              `[resolve-seeds] Exact ref "${r.query}" not found in graph — dropped from seeds`,
            );
            unresolvedLabels.push(r.query);
          }
        }
      }

      // Search fallback for low-confidence fuzzy matches
      if (lowConfidenceLabels.length > 0) {
        await improveLowConfidenceMatches(resolutions, lowConfidenceLabels);
      }
    } catch (err) {
      const detail =
        err instanceof AgentToolError
          ? err.detail
          : err instanceof Error
            ? err.message
            : String(err);
      console.error("[resolve-seeds] Batch resolve failed:", detail);
      // Surface the failure — don't silently return 0 resolutions
      throw new AgentToolError(
        502,
        `Seed resolution failed: ${detail}`,
        "Try again or use exact {type, id} seeds.",
      );
    }
  }

  return { resolutions, unresolved: unresolvedLabels };
}

/**
 * Legacy API — resolve SeedRefs to EntityRefs (without metadata).
 * All existing callers use this.
 */
export async function resolveSeeds(
  refs: SeedRef[],
  resolvedCache?: Record<string, EntityRef>,
): Promise<EntityRef[]> {
  const { resolutions } = await resolveSeedsWithMeta(refs, resolvedCache);
  return resolutions.map((r) => r.entity);
}

/**
 * Log a warning when some (but not all) seeds were dropped during resolution.
 * Call after resolveSeeds to surface partial failures to the LLM via trace.
 */
export function warnPartialResolution(
  inputCount: number,
  resolvedCount: number,
  tc: { warn: (code: string, message: string) => void },
): void {
  if (resolvedCount < inputCount && resolvedCount > 0) {
    tc.warn(
      "partial_resolution",
      `Only ${resolvedCount} of ${inputCount} seeds resolved — ${inputCount - resolvedCount} dropped. Verify entity names or use exact {type, id}.`,
    );
  }
}

/**
 * Search fallback for unresolved labels.
 */
async function searchFallback(label: string): Promise<SeedResolution | null> {
  try {
    const normalized = normalizeLabel(label);
    const resp = await agentFetch<{ data: { results: SearchResultItem[] } }>(
      `/graph/search?q=${encodeURIComponent(normalized)}&limit=3`,
    );
    const searchResults = resp.data?.results ?? [];

    const top = searchResults[0];
    if (!top?.entity) return null;

    const confidence = top.match?.confidence ?? 0;
    const candidates: Candidate[] = searchResults.slice(1, 3).map((r) => ({
      type: r.entity.type,
      id: r.entity.id,
      label: r.entity.label,
      score: r.match?.confidence,
      source: "search" as const,
    }));

    return {
      entity: {
        type: top.entity.type,
        id: top.entity.id,
        label: top.entity.label,
        subtitle: trimSubtitle(top.entity.subtitle),
      },
      confidence,
      strategy: "search_fallback",
      low_confidence: confidence < MIN_CONFIDENCE,
      fallback_used: true,
      candidates: candidates.length > 0 ? candidates : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * For low-confidence resolve results, try a search-based approach.
 * If search returns a higher-confidence match, replace in-place.
 */
async function improveLowConfidenceMatches(
  resolutions: SeedResolution[],
  lowConfidence: Array<{ label: string; resolvedIndex: number }>,
): Promise<void> {
  for (const { label, resolvedIndex } of lowConfidence) {
    try {
      const normalized = normalizeLabel(label);
      const resp = await agentFetch<{ data: { results: SearchResultItem[] } }>(
        `/graph/search?q=${encodeURIComponent(normalized)}&limit=3`,
      );
      const searchResults = resp.data?.results ?? [];

      const top = searchResults[0];
      if (!top?.entity) continue;

      const searchConf = top.match?.confidence ?? 0;

      // Collect candidates
      const candidates: Candidate[] = searchResults.slice(0, 3).map((r) => ({
        type: r.entity.type,
        id: r.entity.id,
        label: r.entity.label,
        score: r.match?.confidence,
        source: "search" as const,
      }));

      if (searchConf >= MIN_CONFIDENCE) {
        // Search found a better match — replace
        resolutions[resolvedIndex] = {
          entity: {
            type: top.entity.type,
            id: top.entity.id,
            label: top.entity.label,
            subtitle: trimSubtitle(top.entity.subtitle),
          },
          confidence: searchConf,
          strategy: "search_fallback",
          low_confidence: false,
          fallback_used: true,
          candidates,
        };
      } else {
        // Still low confidence — attach candidates for disambiguation
        resolutions[resolvedIndex].candidates = candidates;
        resolutions[resolvedIndex].fallback_used = true;
      }
    } catch {
      // Non-critical — keep the resolve result
    }
  }
}

/**
 * Search with an explicit type constraint via /graph/search?q=...&types=...
 */
async function searchWithType(
  label: string,
  type: string,
): Promise<SeedResolution | null> {
  try {
    const normalized = normalizeLabel(label);
    // Try both the exact node type name and lowercase plural for compatibility
    const typeVariants = [type, `${type.toLowerCase()}s`];
    for (const typeParam of typeVariants) {
      try {
        const resp = await agentFetch<{
          data: { results: SearchResultItem[] };
        }>(
          `/graph/search?q=${encodeURIComponent(normalized)}&types=${encodeURIComponent(typeParam)}&limit=3`,
        );
        const top = resp.data?.results?.[0];
        if (!top?.entity) continue;
        const confidence = top.match?.confidence ?? 0.8;
        return {
          entity: {
            type: top.entity.type,
            id: top.entity.id,
            label: top.entity.label,
            subtitle: trimSubtitle(top.entity.subtitle),
          },
          confidence,
          strategy: "search_fallback",
          low_confidence: confidence < MIN_CONFIDENCE,
          fallback_used: true,
        };
      } catch {
        // Try next variant
      }
    }
    console.warn(
      `[resolve-seeds] searchWithType("${label}", "${type}") found no results`,
    );
    return null;
  } catch (err) {
    console.warn(
      `[resolve-seeds] searchWithType("${label}", "${type}") failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Re-resolve seeds with a type hint. Seeds whose type doesn't match
 * expectedType are re-searched with a type constraint.
 * Falls back to original resolution if type-constrained search returns nothing.
 */
export async function resolveSeedsWithTypeHint(
  refs: SeedRef[],
  expectedType?: string,
  resolvedCache?: Record<string, EntityRef>,
): Promise<ResolveResult> {
  const { resolutions, unresolved } = await resolveSeedsWithMeta(
    refs,
    resolvedCache,
  );
  if (!expectedType) return { resolutions, unresolved };

  const corrected: SeedResolution[] = [];
  for (const res of resolutions) {
    if (res.entity.type === expectedType) {
      corrected.push(res);
    } else {
      const reResolved = await searchWithType(res.entity.label, expectedType);
      corrected.push(reResolved ?? res);
    }
  }
  return { resolutions: corrected, unresolved };
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
            item &&
            typeof item.type === "string" &&
            typeof item.id === "string",
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

/** Column candidates for entity extraction — tried in order */
const COHORT_ENTITY_COLUMNS = [
  "gene",
  "gene_symbol",
  "gene_name",
  "rsid",
  "variant_id",
];

async function extractEntitiesFromCohort(
  cohortId: string,
  top?: number,
): Promise<EntityRef[]> {
  try {
    for (const column of COHORT_ENTITY_COLUMNS) {
      try {
        const result = await agentFetch<{
          buckets?: Array<{ key: string; count: number }>;
        }>(`/cohorts/${encodeURIComponent(cohortId)}/groupby`, {
          method: "POST",
          body: { group_by: column, limit: top ?? 5 },
        });

        if (!result.buckets?.length) continue;

        const names = result.buckets.map((b) => b.key).filter(Boolean);
        if (names.length === 0) continue;

        const resolveResp = await agentFetch<{
          data: { results: ResolveResultItem[] };
        }>("/graph/resolve", {
          method: "POST",
          body: { queries: names },
        });

        const entities: EntityRef[] = (resolveResp.data?.results ?? []).flatMap(
          (r) =>
            r.status.toLowerCase() === "matched" && r.entity
              ? [
                  {
                    type: r.entity.type,
                    id: r.entity.id,
                    label: r.entity.label,
                  },
                ]
              : [],
        );

        if (entities.length > 0) return entities;
      } catch {}
    }
    return [];
  } catch {
    return [];
  }
}
