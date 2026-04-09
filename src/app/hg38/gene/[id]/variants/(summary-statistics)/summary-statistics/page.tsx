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

  // Use the raw URL param (`id`) as the scope key, not `gene.gene_symbol`.
  // The variant-explorer route lives under the same `[id]` segment, so
  // drill-down deep links must round-trip with the exact same identifier
  // the user is currently on (could be a symbol or an Ensembl ID — both
  // resolve via fetchGene). gene.gene_symbol could be a different form.
  const stats = await fetchGeneVariantStatistics(gene.gene_symbol || id);

  return (
    <VariantSummaryStatistics
      stats={stats}
      scope={{ kind: "gene", geneSymbol: id }}
    />
  );
}
