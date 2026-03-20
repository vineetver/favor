import { fetchGene } from "@features/gene/api";
import { loadValidatedEnhancersData } from "@features/enrichment/loaders";
import { ValidatedEnhancersView } from "@features/enrichment/components/validated-enhancers-view";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gene = (await fetchGene(id))?.data;
  if (!gene) notFound();
  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;
  const data = await loadValidatedEnhancersData(loc);
  return <ValidatedEnhancersView loc={loc} basePath={basePath} {...data} />;
}
