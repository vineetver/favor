import { fetchJson } from "@infra/api";
import type { PaginatedResponse, TissueGroupRow } from "@features/enrichment/api/region";
import { buildParams } from "@features/enrichment/api/region";
import type {
  CrisprRow,
  FetchCrisprParams,
  PerturbSeqRow,
  FetchPerturbSeqParams,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function perturbUrl(loc: string, endpoint: string, params: Record<string, unknown> = {}): string {
  const qs = buildParams(params);
  return `${API_BASE}/perturbations/${encodeURIComponent(loc)}/${endpoint}${qs ? `?${qs}` : ""}`;
}

export async function fetchCrispr(
  loc: string,
  params: FetchCrisprParams = {},
): Promise<PaginatedResponse<CrisprRow>> {
  return fetchJson(perturbUrl(loc, "crispr", params as Record<string, unknown>));
}

export async function fetchPerturbSeq(
  loc: string,
  params: FetchPerturbSeqParams = {},
): Promise<PaginatedResponse<PerturbSeqRow>> {
  return fetchJson(perturbUrl(loc, "perturb-seq", params as Record<string, unknown>));
}

export async function fetchCrisprByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = perturbUrl(loc, "crispr", { group_by: "tissue_group" });
  const res = await fetchJson<{ data: { group_key: string; max_value: number; count: number; significant?: number }[] }>(url);
  return res.data.map((r) => ({
    tissue_name: r.group_key,
    max_value: r.max_value,
    count: r.count,
    significant: r.significant ?? 0,
  }));
}
