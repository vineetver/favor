import type { VariantCounts } from "@features/gene/api/variant-statistics";
import { fetchOrNull } from "@infra/api";

import { API_BASE } from "@/config/api";

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
