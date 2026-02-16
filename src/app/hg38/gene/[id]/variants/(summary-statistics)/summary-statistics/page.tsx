import { fetchGene } from "@features/gene/api";
import { fetchGeneVariantStatistics } from "@features/gene/api/variant-statistics";
import { VariantSummaryStatistics } from "@features/gene/components/variant-summary-statistics";
import { notFound } from "next/navigation";

interface VariantSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VariantSummaryPage({
  params,
}: VariantSummaryPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const stats = await fetchGeneVariantStatistics(
    gene.gene_symbol || id,
  );

  return <VariantSummaryStatistics stats={stats} geneSymbol={gene.gene_symbol} />;
}
