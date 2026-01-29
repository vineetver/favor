import { fetchGene } from "@features/gene/api";
import { CancerHallmarksOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface CancerHallmarksPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CancerHallmarksPage({
  params,
}: CancerHallmarksPageProps) {
  const { id } = await params;

  const gene = await fetchGene(id);

  if (!gene) {
    notFound();
  }

  return (
    <CancerHallmarksOverview
      hallmarks={gene.opentargets?.hallmarks?.cancerHallmarks}
      geneSymbol={gene.gene_symbol}
    />
  );
}
