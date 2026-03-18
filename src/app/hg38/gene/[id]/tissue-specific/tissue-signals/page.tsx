import { fetchGene } from "@features/gene/api";
import {
  fetchRegionSummary,
  fetchSignalFacets,
  fetchSignals,
  fetchSignalsByTissueGroup,
} from "@features/enrichment/api/region";
import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { notFound } from "next/navigation";

interface TissueSignalsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function TissueSignalsPage({
  params,
  searchParams,
}: TissueSignalsPageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  // Grouped mode: fetch tissue group aggregation only
  // Detail mode: fetch facets + initial data
  const [groupedData, tissueFacets, classFacets, summary, initialSignals] =
    await Promise.all([
      !tissueGroup
        ? fetchSignalsByTissueGroup(loc).catch(() => [])
        : Promise.resolve([]),
      tissueGroup
        ? fetchSignalFacets(loc, "tissue_name").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
      tissueGroup
        ? fetchSignalFacets(loc, "ccre_classification").catch(() => ({
            facets: [],
            count: 0,
          }))
        : Promise.resolve({ facets: [], count: 0 }),
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

  return (
    <div className="space-y-6">
      <SignalHeatmap loc={loc} />

      <TissueSignalsView
        loc={loc}
        totalSignals={summary?.counts.signals ?? 0}
        tissues={tissueFacets.facets.filter(Boolean)}
        classifications={classFacets.facets.filter(Boolean)}
        initialData={initialSignals ?? undefined}
        summary={summary}
        basePath={basePath}
        groupedData={groupedData}
      />
    </div>
  );
}
