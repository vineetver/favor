import { fetchGene } from "@features/gene/api";
import { fetchScoresetsForGene } from "@features/mavedb/api";
import { GeneMaveView } from "@features/mavedb/components/discovery/gene-mave-view";
import { notFound } from "next/navigation";

interface MavePageProps {
  params: Promise<{ id: string }>;
}

export default async function GeneMavePage({ params }: MavePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const geneSymbol = gene.gene_symbol || id;

  const initialData = await fetchScoresetsForGene(geneSymbol).catch(() => null);

  return <GeneMaveView geneSymbol={geneSymbol} initialData={initialData} />;
}
