import { fetchGene } from "@features/gene/api";
import { loadLoopsData } from "@features/enrichment/loaders";
import { LoopsView } from "@features/enrichment/components/loops-view";
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
  const data = await loadLoopsData(loc, tissueGroup);
  return <LoopsView loc={loc} basePath={basePath} {...data} />;
}
