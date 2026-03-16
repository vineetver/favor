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
// Tissue-level aggregation (group_by=tissue_group for cross-table consistency)
// ---------------------------------------------------------------------------

export interface TissueGroupRow {
  tissue_name: string;
  max_value: number;
  count: number;
  significant?: number;
  top_item?: string;
}

export async function fetchSignalsByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/signals?group_by=tissue_group`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

export async function fetchEnhancersByTissueGroup(
  loc: string,
  opts: { method?: string; target_gene?: string } = {},
): Promise<TissueGroupRow[]> {
  const params = new URLSearchParams({ group_by: "tissue_group" });
  if (opts.method) params.set("method", opts.method);
  if (opts.target_gene) params.set("target_gene", opts.target_gene);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/enhancer-genes?${params}`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

export async function fetchAseByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/ase?group_by=tissue_group`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

export async function fetchChromatinByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/chromatin-states?group_by=tissue_group`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

export async function fetchAccessibilityByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/accessibility?group_by=tissue_group`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

export async function fetchLoopsByTissueGroup(
  loc: string,
): Promise<TissueGroupRow[]> {
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/loops?group_by=tissue_group`;
  const res = await fetchJson<{ data: TissueGroupRow[] }>(url);
  return res.data;
}

// ---------------------------------------------------------------------------
// Region Variants (variant-regulatory connections)
// ---------------------------------------------------------------------------

export interface RegionVariantRow {
  vid: number;
  chrom_id: number;
  position: number;
  variant_vcf: string;
  region_table: string;
  region_id: string;
}

export async function fetchRegionVariants(
  loc: string,
  params: { region_table?: string; cursor?: string; limit?: number } = {},
): Promise<PaginatedResponse<RegionVariantRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/variants${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<RegionVariantRow>>(url);
}

// ---------------------------------------------------------------------------
// Tissue Signals
// ---------------------------------------------------------------------------

export interface SignalRow {
  ccre_id: string;
  start: number;
  end: number;
  tissue_name: string;
  tissue_group?: string;
  subtissue_name?: string;
  dnase: number | null;
  atac: number | null;
  ctcf: number | null;
  h3k27ac: number | null;
  h3k4me3: number | null;
  has_dnase?: boolean;
  has_atac?: boolean;
  has_ctcf?: boolean;
  has_h3k27ac?: boolean;
  has_h3k4me3?: boolean;
  max_signal: number;
  ccre_classification: string;
}

export interface FetchSignalsParams {
  tissue?: string;
  tissue_group?: string;
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
  tissue_group?: string;
  state_code: string;
  state_name: string;
  state_category: string;
  state_color: string;
}

export interface FetchChromatinStatesParams {
  tissue?: string;
  tissue_group?: string;
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
  tissue_group?: string;
  score: number | null;
  distance: number | null;
  detail: Record<string, unknown> | null;
}

export interface FetchEnhancerGenesParams {
  tissue?: string;
  tissue_group?: string;
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

// ---------------------------------------------------------------------------
// Accessibility Peaks
// ---------------------------------------------------------------------------

export interface AccessibilityRow {
  start: number;
  end: number;
  peak_id: string;
  tissue_name: string;
  tissue_group?: string;
  signal_value: number;
}

export interface FetchAccessibilityParams {
  tissue?: string;
  tissue_group?: string;
  min_signal?: number;
  sort_by?: "position" | "max_signal" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchAccessibility(
  loc: string,
  params: FetchAccessibilityParams = {},
): Promise<PaginatedResponse<AccessibilityRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/accessibility${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<AccessibilityRow>>(url);
}

// ---------------------------------------------------------------------------
// Chromatin Loops
// ---------------------------------------------------------------------------

export interface LoopRow {
  anchor1_start: number;
  anchor1_end: number;
  anchor2_start: number;
  anchor2_end: number;
  loop_span: number;
  assay_type: string;
  tissue_name: string;
  tissue_group?: string;
}

export interface FetchLoopsParams {
  tissue?: string;
  tissue_group?: string;
  assay?: string;
  cursor?: string;
  limit?: number;
}

export async function fetchLoops(
  loc: string,
  params: FetchLoopsParams = {},
): Promise<PaginatedResponse<LoopRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/loops${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<LoopRow>>(url);
}

// ---------------------------------------------------------------------------
// Allele-Specific Epigenomic Activity (ASE)
// ---------------------------------------------------------------------------

export interface AseRow {
  ccre_accession: string;
  start: number;
  end: number;
  tissue_name: string;
  tissue_group?: string;
  assay: string;
  neglog_pvalue: number;
  is_significant: boolean;
}

export interface FetchAseParams {
  tissue?: string;
  tissue_group?: string;
  significant_only?: boolean;
  assay?: string;
  sort_by?: "position" | "tissue_name";
  sort_dir?: "asc" | "desc";
  cursor?: string;
  limit?: number;
}

export async function fetchAse(
  loc: string,
  params: FetchAseParams = {},
): Promise<PaginatedResponse<AseRow>> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/ase${qs ? `?${qs}` : ""}`;
  return fetchJson<PaginatedResponse<AseRow>>(url);
}

// ---------------------------------------------------------------------------
// Validated Enhancers (VISTA)
// ---------------------------------------------------------------------------

export interface ValidatedEnhancerRow {
  start: number;
  end: number;
  element_id: string;
  is_positive: boolean;
  tissues_raw: string;
}

export async function fetchValidatedEnhancers(
  loc: string,
  positiveOnly?: boolean,
): Promise<ValidatedEnhancerRow[]> {
  const params = positiveOnly ? "?positive_only=true" : "";
  const url = `${API_BASE}/regions/${encodeURIComponent(loc)}/validated-enhancers${params}`;
  return fetchJson<ValidatedEnhancerRow[]>(url);
}

// ---------------------------------------------------------------------------
// cCRE-Gene Links (gene-keyed, not region-indexed)
// ---------------------------------------------------------------------------

export interface CcreLinkRow {
  ccre_id: string;
  gene_symbol: string;
  source: string;
  method: string;
  tissue_name: string;
  score: number | null;
  effect_size: number | null;
}

interface CcreLinksResponse {
  data: CcreLinkRow[];
}

export interface FetchCcreLinksParams {
  source?: string;
  method?: string;
  tissue?: string;
  limit?: number;
}

export async function fetchCcreLinks(
  gene: string,
  params: FetchCcreLinksParams = {},
): Promise<CcreLinkRow[]> {
  const qs = buildParams(params as unknown as Record<string, unknown>);
  const url = `${API_BASE}/genes/${encodeURIComponent(gene)}/ccre-links${qs ? `?${qs}` : ""}`;
  const res = await fetchJson<CcreLinksResponse>(url);
  return res.data;
}

// ---------------------------------------------------------------------------
// cCRE Detail (for slide-over panel)
// ---------------------------------------------------------------------------

export interface CcreSignal {
  tissue_name: string;
  max_signal: number;
  h3k27ac?: number;
  dnase?: number;
}

export interface CcreGeneLink {
  gene_symbol: string;
  source: string;
  method: string;
  tissue_name: string;
  score: number | null;
}

export interface CcreDetail {
  ccre_id: string;
  chrom: string;
  start: number;
  end: number;
  classifications: string[];
  signals: {
    total_tissues: number;
    top: CcreSignal[];
  };
  genes: {
    total: number;
    links: CcreGeneLink[];
  };
}

export async function fetchCcreDetail(
  ccreId: string,
  params?: { tissue?: string; signal_limit?: number; gene_limit?: number },
): Promise<CcreDetail> {
  const qs = params
    ? buildParams(params as unknown as Record<string, unknown>)
    : "";
  const url = `${API_BASE}/ccres/${encodeURIComponent(ccreId)}${qs ? `?${qs}` : ""}`;
  return fetchJson<CcreDetail>(url);
}
