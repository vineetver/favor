import { fetchGene } from "@features/gene/api";
import {
  fetchChromatinStateFacets,
  fetchChromatinStates,
  fetchRegionSummary,
} from "@features/gene/api/region";
import { ChromatinStatesView } from "@features/gene/components/tissue-specific/chromatin-states-view";
import { notFound } from "next/navigation";

interface ChromatinStatesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChromatinStatesPage({
  params,
}: ChromatinStatesPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [tissueFacets, categoryFacets, summary, initialData] =
    await Promise.all([
      fetchChromatinStateFacets(loc, "tissue_name").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchChromatinStateFacets(loc, "state_category").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchRegionSummary(loc).catch(() => null),
      fetchChromatinStates(loc, {
        sort_by: "position",
        sort_dir: "asc",
        limit: 25,
      }).catch(() => null),
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
    />
  );
}
