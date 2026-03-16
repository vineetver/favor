import { fetchGene } from "@features/gene/api";
import {
  fetchRegionSummary,
  fetchSignalFacets,
  fetchSignals,
} from "@features/enrichment/api/region";
import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { notFound } from "next/navigation";

interface TissueSignalsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TissueSignalsPage({
  params,
}: TissueSignalsPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [tissueFacets, classFacets, summary, initialSignals] =
    await Promise.all([
      fetchSignalFacets(loc, "tissue_name").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchSignalFacets(loc, "ccre_classification").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchRegionSummary(loc).catch(() => null),
      fetchSignals(loc, {
        sort_by: "max_signal",
        sort_dir: "desc",
        limit: 25,
      }).catch(() => null),
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
      />
    </div>
  );
}
