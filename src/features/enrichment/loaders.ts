/**
 * Shared data loaders for regulatory enrichment pages.
 * Both gene and variant pages call the same loaders — the only difference
 * is how `loc` is resolved (gene symbol vs chr:pos-pos).
 */

import {
  fetchAccessibility,
  fetchAccessibilityByTissueGroup,
  fetchAse,
  fetchAseByTissueGroup,
  fetchCcreGeneLinks,
  fetchCcreGeneLinksByTissueGroup,
  fetchChromatinByTissueGroup,
  fetchChromatinStateFacets,
  fetchChromatinStates,
  fetchChromBpnet,
  fetchChromBpnetByTissueGroup,
  fetchEnhancerGeneFacets,
  fetchEnhancerGenes,
  fetchEnhancersByTissueGroup,
  fetchLoops,
  fetchLoopsByTissueGroup,
  fetchMethylation,
  fetchMethylationByTissueGroup,
  fetchQtls,
  fetchQtlsByTissueGroup,
  fetchRegionSummary,
  fetchSignalFacets,
  fetchSignals,
  fetchSignalsByTissueGroup,
  fetchTissueScores,
  fetchValidatedEnhancers,
  fetchVariantAllelicImbalance,
  fetchVariantAllelicImbalanceByTissueGroup,
} from "@features/enrichment/api/region";

const noFacets = { facets: [] as string[], count: 0 };

// ---------------------------------------------------------------------------
// Tissue Signals
// ---------------------------------------------------------------------------

export async function loadTissueSignalsData(loc: string, tissueGroup?: string) {
  const [groupedData, tissueFacets, classFacets, summary, initialData] =
    await Promise.all([
      !tissueGroup
        ? fetchSignalsByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchSignalFacets(loc, "tissue_name").catch(() => noFacets)
        : Promise.resolve(noFacets),
      tissueGroup
        ? fetchSignalFacets(loc, "ccre_classification").catch(() => noFacets)
        : Promise.resolve(noFacets),
      fetchRegionSummary(loc).catch(() => null),
      tissueGroup
        ? fetchSignals(loc, {
            tissue_group: tissueGroup,
            sort_by: "max_signal",
            sort_dir: "desc",
            limit: 25,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

  return {
    totalSignals: summary?.counts.signals ?? 0,
    tissues: tissueFacets.facets.filter(Boolean),
    classifications: classFacets.facets.filter(Boolean),
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Chromatin States
// ---------------------------------------------------------------------------

export async function loadChromatinStatesData(
  loc: string,
  tissueGroup?: string,
) {
  const [groupedData, tissueFacets, categoryFacets, summary, initialData] =
    await Promise.all([
      !tissueGroup
        ? fetchChromatinByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchChromatinStateFacets(loc, "tissue_name").catch(() => noFacets)
        : Promise.resolve(noFacets),
      tissueGroup
        ? fetchChromatinStateFacets(loc, "state_category").catch(() => noFacets)
        : Promise.resolve(noFacets),
      fetchRegionSummary(loc).catch(() => null),
      tissueGroup
        ? fetchChromatinStates(loc, {
            tissue_group: tissueGroup,
            sort_by: "position",
            sort_dir: "asc",
            limit: 25,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

  return {
    tissues: tissueFacets.facets.filter(Boolean),
    categories: categoryFacets.facets.filter(Boolean),
    totalCount: summary?.counts.chromatin_states ?? 0,
    regionCoords: summary?.region ?? "",
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Accessibility (Peaks)
// ---------------------------------------------------------------------------

export async function loadAccessibilityData(loc: string, tissueGroup?: string) {
  const [groupedData, summary, initialData] = await Promise.all([
    !tissueGroup
      ? fetchAccessibilityByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchAccessibility(loc, {
          tissue_group: tissueGroup,
          sort_by: "max_signal",
          sort_dir: "desc",
          limit: 100,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    tissues: initialData
      ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
      : [],
    totalCount: summary?.counts.accessibility_peaks ?? 0,
    regionCoords: summary?.region ?? "",
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Enhancer-Gene Predictions
// ---------------------------------------------------------------------------

export async function loadEnhancerGenesData(loc: string, tissueGroup?: string) {
  const [groupedData, geneFacets, tissueFacets, summary, initialData] =
    await Promise.all([
      !tissueGroup
        ? fetchEnhancersByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchEnhancerGeneFacets(loc, "gene_symbol").catch(() => noFacets)
        : Promise.resolve(noFacets),
      tissueGroup
        ? fetchEnhancerGeneFacets(loc, "tissue_name").catch(() => noFacets)
        : Promise.resolve(noFacets),
      fetchRegionSummary(loc).catch(() => null),
      tissueGroup
        ? fetchEnhancerGenes(loc, {
            tissue_group: tissueGroup,
            method: "abc",
            sort_by: "score",
            sort_dir: "desc",
            limit: 25,
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

  return {
    totalCount: summary?.counts.enhancer_genes ?? 0,
    genes: geneFacets.facets.filter(Boolean),
    tissues: tissueFacets.facets.filter(Boolean),
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Chromatin Loops
// ---------------------------------------------------------------------------

export async function loadLoopsData(loc: string, tissueGroup?: string) {
  const [groupedData, summary, initialData] = await Promise.all([
    !tissueGroup
      ? fetchLoopsByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchLoops(loc, { tissue_group: tissueGroup, limit: 100 }).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];
  const assays = initialData
    ? [
        ...new Set(
          initialData.data.flatMap((r) =>
            r.assay_type.split(",").map((a) => a.trim()),
          ),
        ),
      ].sort()
    : [];

  return {
    tissues,
    assays,
    totalCount: summary?.counts.loops ?? 0,
    regionCoords: summary?.region ?? "",
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Allele-Specific Expression
// ---------------------------------------------------------------------------

export async function loadAseData(loc: string, tissueGroup?: string) {
  const [groupedData, summary, initialData] = await Promise.all([
    !tissueGroup
      ? fetchAseByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchAse(loc, {
          tissue_group: tissueGroup,
          sort_by: "neglog_pvalue",
          sort_dir: "desc",
          limit: 100,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];
  const assays = initialData
    ? [...new Set(initialData.data.map((r) => r.assay))].sort()
    : [];

  return {
    tissues,
    assays,
    totalCount: summary?.counts.ase ?? 0,
    initialData: initialData ?? undefined,
    summary,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// QTLs
// ---------------------------------------------------------------------------

export async function loadQtlsData(
  loc: string,
  tissueGroup?: string,
  source = "gtex",
) {
  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchQtlsByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchQtls(loc, {
          tissue_group: tissueGroup,
          source,
          sort_by: "neglog_pvalue",
          sort_dir: "desc",
          limit: 25,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const genes = initialData
    ? (
        [
          ...new Set(
            initialData.data.map((r) => r.gene_symbol).filter(Boolean),
          ),
        ] as string[]
      ).sort()
    : [];

  return {
    totalCount: initialData?.page_info?.total_count ?? 0,
    genes,
    initialData: initialData ?? undefined,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// ChromBPNet
// ---------------------------------------------------------------------------

export async function loadChromBpnetData(loc: string, tissueGroup?: string) {
  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchChromBpnetByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchChromBpnet(loc, {
          tissue_group: tissueGroup,
          sort_by: "combined_score",
          sort_dir: "desc",
          limit: 25,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    totalCount: initialData?.page_info?.total_count ?? 0,
    initialData: initialData ?? undefined,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Validated Enhancers (VISTA)
// ---------------------------------------------------------------------------

export async function loadValidatedEnhancersData(loc: string) {
  const [summary, data] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchValidatedEnhancers(loc).catch(() => []),
  ]);

  return {
    data,
    regionCoords: summary?.region ?? "",
    summary,
  };
}

// ---------------------------------------------------------------------------
// Tissue Scores (V2F)
// ---------------------------------------------------------------------------

export async function loadTissueScoresData(loc: string) {
  const initialData = await fetchTissueScores(loc, {
    sort_by: "score",
    sort_dir: "desc",
    limit: 25,
  }).catch(() => null);

  return {
    totalCount: initialData?.page_info?.total_count ?? 0,
    initialData: initialData ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// cCRE Gene Links (variant cCRE → genes)
// ---------------------------------------------------------------------------

export async function loadCcreGeneLinksData(
  ccreId: string,
  tissueGroup?: string,
) {
  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchCcreGeneLinksByTissueGroup(ccreId).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchCcreGeneLinks(ccreId, {
          tissue_group: tissueGroup,
          limit: 50,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    totalCount:
      initialData?.page_info?.total_count ?? initialData?.page_info?.count ?? 0,
    initialData: initialData ?? undefined,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Allelic Imbalance (variant-level, tissue-group-first)
// ---------------------------------------------------------------------------

export async function loadAllelicImbalanceData(
  loc: string,
  tissueGroup?: string,
) {
  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchVariantAllelicImbalanceByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchVariantAllelicImbalance(loc, {
          tissue_group: tissueGroup,
          sort_by: "neglog_pvalue",
          sort_dir: "desc",
          limit: 25,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];
  const marks = initialData
    ? [...new Set(initialData.data.map((r) => r.mark))].sort()
    : [];

  return {
    tissues,
    marks,
    totalCount: initialData?.page_info?.total_count ?? 0,
    initialData: initialData ?? undefined,
    groupedData,
  };
}

// ---------------------------------------------------------------------------
// Methylation (variant-level, tissue-group-first)
// ---------------------------------------------------------------------------

export async function loadMethylationData(loc: string, tissueGroup?: string) {
  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchMethylationByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchMethylation(loc, {
          tissue_group: tissueGroup,
          sort_by: "neglog_pvalue",
          sort_dir: "desc",
          limit: 25,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  return {
    tissues,
    totalCount: initialData?.page_info?.total_count ?? 0,
    initialData: initialData ?? undefined,
    groupedData,
  };
}
