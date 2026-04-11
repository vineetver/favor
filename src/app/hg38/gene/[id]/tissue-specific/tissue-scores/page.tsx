import { TissueScoresView } from "@features/enrichment/components/tissue-scores-view";
import { loadTissueScoresData } from "@features/enrichment/loaders";
import { fetchGene } from "@features/gene/api";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gene = (await fetchGene(id))?.data;
  if (!gene) notFound();
  const loc = gene.gene_symbol || id;
  const data = await loadTissueScoresData(loc);
  return <TissueScoresView loc={loc} {...data} />;
}
