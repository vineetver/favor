import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { loadTissueSignalsData } from "@features/enrichment/loaders";
import { fetchGene } from "@features/gene/api";
import { notFound } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;
  const gene = (await fetchGene(id))?.data;
  if (!gene) notFound();
  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;
  const data = await loadTissueSignalsData(loc, tissueGroup);
  return (
    <div className="space-y-6">
      <SignalHeatmap loc={loc} />
      <TissueSignalsView loc={loc} basePath={basePath} {...data} />
    </div>
  );
}
