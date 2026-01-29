import { fetchGene } from "@features/gene/api";
import { ChemicalProbesOverview } from "@features/gene/components";
import { notFound } from "next/navigation";

interface ChemicalProbesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChemicalProbesPage({
  params,
}: ChemicalProbesPageProps) {
  const { id } = await params;

  const gene = await fetchGene(id);

  if (!gene) {
    notFound();
  }

  return (
    <ChemicalProbesOverview
      probes={gene.opentargets?.chemical_probes}
      geneSymbol={gene.gene_symbol}
    />
  );
}
