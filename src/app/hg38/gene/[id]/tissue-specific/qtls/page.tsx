import { QtlsView } from "@features/enrichment/components/qtls-view";
import { loadQtlsData } from "@features/enrichment/loaders";
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
  const data = await loadQtlsData(loc, tissueGroup);
  return <QtlsView loc={loc} {...data} />;
}
