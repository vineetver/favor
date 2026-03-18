import { notFound } from "next/navigation";
import { fetchGene } from "@features/gene/api";
import { AlphaGenomeRegionView } from "@features/alphagenome/components/region-view";

interface AlphaGenomeGenePageProps {
  params: Promise<{ id: string }>;
}

export default async function AlphaGenomeGenePage({
  params,
}: AlphaGenomeGenePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  return (
    <AlphaGenomeRegionView
      chromosome={gene.chromosome}
      start={gene.start0}
      end={gene.end0_excl}
    />
  );
}
