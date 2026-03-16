import { fetchJson, fetchOrNull } from "@infra/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Shared pagination types
// ---------------------------------------------------------------------------

export interface PageInfo {
  next_cursor: string | null;
  count: number;
  has_more: boolean;
  total_count?: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  page_info: PageInfo;
}

export interface FacetsResponse {
  facets: string[];
  count: number;
}

// ---------------------------------------------------------------------------
// Region summary
// ---------------------------------------------------------------------------

export interface RegionSummary {
  region: string;
  counts: {
    signals: number;
    chromatin_states: number;
    enhancer_genes: number;
    accessibility_peaks: number;
    loops: number;
    ase: number;
    validated_enhancers: number;
  };
}

export async function fetchRegionSummary(
  loc: string,
): Promise<RegionSummary | null> {
  return fetchOrNull<RegionSummary>(
    `${API_BASE}/regions/${encodeURIComponent(loc)}`,
  );
}

// ---------------------------------------------------------------------------
// Tissue Signals
// ---------------------------------------------------------------------------

export interface SignalRow {
  ccre_id: string;
  start: number;
  end: number;
  tissue_name: string;
  dnase: number | null;
  atac: number | null;
  ctcf: number | null;
  h3k27ac: number | null;
  h3k4me3: number | null;
  max_signal: number;
  ccre_classification: string;
}

export interface FetchSignalsParams {
  tissue?: string;
  ccre_class?: string;
  min_signal?: number;
  facets?: "tissue_name" | "ccre_classification";
  sort_by?: "position" | "max_signal" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

function buildParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

export async function fetchSignals(
  loc: string,
  params: FetchSignalsParams = {},
): Promise<PaginatedResponse<SignalRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/signals${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<SignalRow>>(url);
}

export async function fetchSignalFacets(
  loc: string,
  facet: "tissue_name" | "ccre_classification",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/signals?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}

// ---------------------------------------------------------------------------
// Chromatin States
// ---------------------------------------------------------------------------

export interface ChromatinStateRow {
  start: number;
  end: number;
  tissue_name: string;
  state_code: string;
  state_name: string;
  state_category: string;
  state_color: string;
}

export interface FetchChromatinStatesParams {
  tissue?: string;
  state_category?: string;
  facets?: "tissue_name" | "state_category" | "state_code";
  sort_by?: "position" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchChromatinStates(
  loc: string,
  params: FetchChromatinStatesParams = {},
): Promise<PaginatedResponse<ChromatinStateRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<ChromatinStateRow>>(url);
}

export async function fetchChromatinStateFacets(
  loc: string,
  facet: "tissue_name" | "state_category" | "state_code",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}

// ---------------------------------------------------------------------------
// Enhancer-Gene Predictions
// ---------------------------------------------------------------------------

export interface EnhancerGeneRow {
  method: "abc" | "epiraction" | "epimap" | "re2g";
  start: number;
  end: number;
  gene_symbol: string | null;
  tissue_name: string;
  score: number | null;
  distance: number | null;
  detail: Record<string, unknown> | null;
}

export interface FetchEnhancerGenesParams {
  tissue?: string;
  method?: "abc" | "epiraction" | "epimap" | "re2g";
  target_gene?: string;
  min_score?: number;
  facets?: "tissue_name" | "gene_symbol" | "method";
  sort_by?: "position" | "score" | "distance";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchEnhancerGenes(
  loc: string,
  params: FetchEnhancerGenesParams = {},
): Promise<PaginatedResponse<EnhancerGeneRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<EnhancerGeneRow>>(url);
}

export async function fetchEnhancerGeneFacets(
  loc: string,
  facet: "tissue_name" | "gene_symbol" | "method",
): Promise<FacetsResponse> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?facets=${facet}`;
  return fetchJson<FacetsResponse>(url);
}
