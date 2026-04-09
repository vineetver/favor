import { API_BASE } from "@/config/api";
import type { TraitPoint } from "./gwas-graph";
import {
  ep,
  fetchVariantGraph,
  getEdgeRows,
  nb,
} from "./variant-graph";

/**
 * Fetch fine-mapped credible set memberships for a variant.
 *
 * Two calls, ~1s total for 500 signals:
 *   1. /graph/Variant/{vcf}?edgeTypes=SIGNAL_HAS_VARIANT&neighborMode=full
 *      — returns every edge with the full Signal node inlined (method_name,
 *      num_credible_95, study_id, study_type, region, log_bayes_factor, …).
 *      No need to batch-fetch Signal details separately.
 *   2. /graph/entities (Study, chunked at 200) — resolves the GCST study_id
 *      to its reported_trait. The endpoint promotes reported_trait into
 *      entity.label, so we read it from there.
 */

// ---------------------------------------------------------------------------
// Row for table consumption
// ---------------------------------------------------------------------------

export interface CredibleSetSignal {
  signalId: string;
  studyId: string;
  studyType: string;
  reportedTrait: string | null;
  methodName: string | null;
  numCredible95: number | null;
  numVariants: number | null;
  region: string | null;
  logBayesFactor: number | null;
  posteriorProbability: number | null;
  confidence: string | null;
  isLead: boolean;
}

// /graph/entities caps id__in at 200 per request.
const ENTITIES_BATCH_CAP = 200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > 0 ? s : null;
}

/**
 * Batch-resolve GCST-style study ids to their reported_trait (stored as
 * entity.label). Chunks parallel batches of 200 to work around the
 * /graph/entities id__in cap. FINNGEN / UKB_PPP / etc. ids don't resolve —
 * they're not indexed as Study nodes, and callers show "—" for those.
 */
async function fetchStudyTraits(
  studyIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (studyIds.length === 0) return out;

  const batches = chunk(studyIds, ENTITIES_BATCH_CAP);
  const responses = await Promise.all(
    batches.map(async (batch) => {
      try {
        const res = await fetch(`${API_BASE}/graph/entities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: "Study",
            filters: { id__in: batch },
            fields: ["id", "reported_trait"],
            mode: "standard",
            limit: batch.length,
          }),
        });
        if (!res.ok) return [];
        const json = (await res.json()) as {
          data?: {
            items?: Array<{
              entity: { id: string; label?: string };
            }>;
          };
        };
        return json.data?.items ?? [];
      } catch {
        return [];
      }
    }),
  );

  for (const batch of responses) {
    for (const item of batch) {
      const label = item.entity.label;
      if (label) out.set(item.entity.id, label);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Plot-facing fetcher: returns TraitPoint[] with y = PIP.
 * Categorized by study_type (gwas/eqtl/pqtl/sqtl/tuqtl/sceqtl).
 */
export async function fetchVariantCredibleSets(
  vcf: string,
  limit = 500,
): Promise<TraitPoint[]> {
  const signals = await fetchVariantSignals(vcf, limit);
  return signals.map((s, i) => ({
    id: `Signal-${s.signalId}-${i}`,
    traitName: s.reportedTrait ?? s.studyId,
    category: s.studyType || "other",
    yValue: s.posteriorProbability,
    orBeta: null,
    riskAlleleFreq: null,
    mappedGene: null,
    variantCount: s.numCredible95,
    method: s.methodName,
    studyId: s.studyId,
  }));
}

/**
 * Table-facing fetcher: returns the full Signal row shape with trait
 * resolved from the underlying Study.
 */
export async function fetchVariantSignals(
  vcf: string,
  limit = 500,
): Promise<CredibleSetSignal[]> {
  if (!vcf) return [];

  // One call — Signal fields inlined via neighborMode=full.
  const graph = await fetchVariantGraph(
    vcf,
    ["SIGNAL_HAS_VARIANT"],
    limit,
    { SIGNAL_HAS_VARIANT: "full" },
  );
  if (!graph) return [];

  const edgeRows = getEdgeRows(graph, "SIGNAL_HAS_VARIANT");
  if (edgeRows.length === 0) return [];

  // Collect unique GCST-prefixed study ids for trait resolution. Non-GCST
  // studies (FINNGEN, UKB_PPP, etc.) aren't in the Study index, so skip them.
  const gcstStudyIds = Array.from(
    new Set(
      edgeRows
        .map((r) => nb<string>(r, "study_id"))
        .filter((id): id is string => !!id && id.startsWith("GCST")),
    ),
  );
  const studyTraits = await fetchStudyTraits(gcstStudyIds);

  return edgeRows.map((row) => {
    const n = row.neighbor;
    const studyId = nb<string>(row, "study_id") ?? n.id;
    const leadVariant = nb<string>(row, "lead_variant") ?? nb<string>(row, "lead");
    return {
      signalId: n.id,
      studyId,
      studyType: nb<string>(row, "study_type") ?? nb<string>(row, "type") ?? "other",
      reportedTrait: studyTraits.get(studyId) ?? null,
      methodName: strOrNull(nb(row, "method_name")),
      numCredible95: numOrNull(nb(row, "num_credible_95")),
      numVariants: numOrNull(nb(row, "num_variants")),
      region: strOrNull(nb(row, "region")),
      logBayesFactor:
        numOrNull(nb(row, "log_bayes_factor")) ??
        numOrNull(ep(row, "log_bayes_factor")),
      posteriorProbability: numOrNull(ep(row, "posterior_probability")),
      confidence: strOrNull(nb(row, "confidence")),
      isLead: leadVariant === vcf || leadVariant === `chr${vcf}`,
    };
  });
}
