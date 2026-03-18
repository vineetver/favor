import { fetchGene } from "@features/gene/api";
import {
  fetchChromatinByTissueGroup,
  fetchChromatinStateFacets,
  fetchChromatinStates,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { ChromatinStatesView } from "@features/enrichment/components/chromatin-states-view";
import { notFound } from "next/navigation";

interface ChromatinStatesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function ChromatinStatesPage({
  params,
  searchParams,
}: ChromatinStatesPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [groupedData, tissueFacets, categoryFacets, summary, initialData] =
    await Promise.all([
      !tissueGroup
        ? fetchChromatinByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchChromatinStateFacets(loc, "tissue_name").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
      tissueGroup
        ? fetchChromatinStateFacets(loc, "state_category").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
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

  return (
    <ChromatinStatesView
      loc={loc}
      tissues={tissueFacets.facets.filter(Boolean)}
      categories={categoryFacets.facets.filter(Boolean)}
      totalCount={summary?.counts.chromatin_states ?? 0}
      regionCoords={summary?.region ?? ""}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
      groupedData={groupedData}
    />
  );
}
