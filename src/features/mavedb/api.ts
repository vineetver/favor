import { buildParams } from "@features/enrichment/api/region";
import { ApiError, fetchJson } from "@infra/api";
import { API_BASE } from "@/config/api";
import type {
  DistributionPayload,
  FetchDistributionParams,
  FetchScoresetsParams,
  FetchVariantsParams,
  MavedbVariant,
  Page,
  ScoresetDetail,
  ScoresetSummary,
  VariantBand,
} from "./types";

// MaveDB URNs (`urn:mavedb:NNNNNNNN-X-N`) must hit the backend raw — its
// route prefix check rejects percent-encoded colons. Path segments that
// embed a URN are interpolated as-is for that reason.
const root = (suffix: string): string => `${API_BASE}/mavedb/${suffix}`;

function withQs(url: string, params: Record<string, unknown>): string {
  const qs = buildParams(params);
  return qs ? `${url}?${qs}` : url;
}

// Detail/distribution payloads are still being filled in upstream
// (calibrations land in batches as IGVF / ExCALIBR publish). Default
// 1-hour Next data-cache pinned stale "0 calibrations" snapshots; a short
// window makes new bands appear within a minute.
const DETAIL_REVALIDATE = 60;

export async function fetchScoresets(
  params: FetchScoresetsParams = {},
): Promise<Page<ScoresetSummary>> {
  return fetchJson<Page<ScoresetSummary>>(
    withQs(root("scoresets"), params as Record<string, unknown>),
  );
}

/**
 * The catalogued endpoint returns empty for many real symbols (BRCA1, JAG1,
 * TP53), so fall back to text search and tag the response with `via` so
 * the UI can disclose the fallback.
 */
export async function fetchScoresetsForGene(
  symbol: string,
  opts: Omit<FetchScoresetsParams, "gene" | "q"> = {},
): Promise<Page<ScoresetSummary> & { via: "symbol" | "search" }> {
  const symbolUrl = withQs(
    root(`genes/${encodeURIComponent(symbol)}/scoresets`),
    opts as Record<string, unknown>,
  );
  const direct = await fetchJson<Page<ScoresetSummary>>(symbolUrl);
  if (direct.data.length > 0) return { ...direct, via: "symbol" };
  const search = await fetchScoresets({ ...opts, q: symbol });
  return { ...search, via: "search" };
}

export async function fetchScoresetDetail(
  urn: string,
): Promise<ScoresetDetail> {
  return fetchJson<ScoresetDetail>(root(`scoresets/${urn}`), {
    revalidate: DETAIL_REVALIDATE,
  });
}

export async function fetchScoresetVariants(
  urn: string,
  params: FetchVariantsParams = {},
): Promise<Page<MavedbVariant>> {
  return fetchJson<Page<MavedbVariant>>(
    withQs(
      root(`scoresets/${urn}/variants`),
      params as Record<string, unknown>,
    ),
  );
}

/**
 * 404 from the distribution endpoint = "no scoreable variants for this
 * view". An honest empty state, not an error.
 */
export async function fetchDistribution(
  urn: string,
  params: FetchDistributionParams = {},
): Promise<DistributionPayload | null> {
  try {
    return await fetchJson<DistributionPayload>(
      withQs(
        root(`scoresets/${urn}/distribution`),
        params as Record<string, unknown>,
      ),
      { revalidate: DETAIL_REVALIDATE },
    );
  } catch (e) {
    if (e instanceof ApiError && e.code === 404) return null;
    throw e;
  }
}

export async function fetchVariantBands(vcf: string): Promise<VariantBand[]> {
  return fetchJson<VariantBand[]>(root(`variants/${encodeURIComponent(vcf)}`));
}
