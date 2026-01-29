import { fetchGene } from "@features/gene/api";
import { SafetyLiabilitiesAccordion } from "@features/gene/components";
import { notFound } from "next/navigation";

interface SafetyLiabilitiesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SafetyLiabilitiesPage({
  params,
}: SafetyLiabilitiesPageProps) {
  const { id } = await params;

  const gene = await fetchGene(id);

  if (!gene) {
    notFound();
  }

  return (
    <SafetyLiabilitiesAccordion
      liabilities={gene.opentargets?.safety_liabilities}
      geneSymbol={gene.gene_symbol}
    />
  );
}
