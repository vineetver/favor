import { fetchJson } from "@infra/api";
import type { PaginatedResponse } from "@features/enrichment/api/region";
import type {
  CrisprRow,
  FetchCrisprParams,
  PerturbSeqRow,
  FetchPerturbSeqParams,
  MaveRow,
  FetchMaveParams,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function buildParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

// ---------------------------------------------------------------------------
// CRISPR
// ---------------------------------------------------------------------------

export async function fetchCrispr(
  loc: string,
  params: FetchCrisprParams = {},
): Promise<PaginatedResponse<CrisprRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/crispr${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<CrisprRow>>(url);
}

// ---------------------------------------------------------------------------
// Perturb-seq
// ---------------------------------------------------------------------------

export async function fetchPerturbSeq(
  loc: string,
  params: FetchPerturbSeqParams = {},
): Promise<PaginatedResponse<PerturbSeqRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/perturb-seq${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<PerturbSeqRow>>(url);
}

// ---------------------------------------------------------------------------
// MAVE
// ---------------------------------------------------------------------------

export async function fetchMave(
  loc: string,
  params: FetchMaveParams = {},
): Promise<PaginatedResponse<MaveRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/perturbations/${encodeURIComponent(loc)}/mave${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<MaveRow>>(url);
}
