import { fetchOrNull } from "@infra/api";
import type { VariantCounts } from "@features/gene/api/variant-statistics";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface RegionBin {
  chromosome: string;
  binStart: number;
  binEnd: number;
  counts: VariantCounts;
}

/**
 * API response shape from GET /statistics/region?region=
 *
 * Top-level: { chromosome, start, end, bins, aggregated }
 * - bins[].counts is a nested VariantCounts object
 * - aggregated is a FLAT VariantCounts (counts live directly on the object, not under .counts)
 */
export interface RegionVariantStatistics {
  chromosome: string;
  start: number;
  end: number;
  bins: RegionBin[];
  aggregated: VariantCounts | null;
}

/**
 * Fetch pre-aggregated variant statistics for a genomic region.
 * Uses GET /statistics/region?region=
 */
export async function fetchRegionVariantStatistics(
  region: string,
): Promise<RegionVariantStatistics | null> {
  const url = `${API_BASE}/statistics/region?region=${encodeURIComponent(region)}`;
  return fetchOrNull<RegionVariantStatistics>(url);
}
