import { fetchGene } from "@features/gene/api";
import { TissueExpressionChart } from "@features/gene/components";
import { notFound } from "next/navigation";

interface GeneExpressionPageProps {
  params: Promise<{
    id: string;
    category: string;
    expression: string;
  }>;
}

export default async function GeneExpressionPage({
  params,
}: GeneExpressionPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  return <TissueExpressionChart gtex={gene.gtex} />;
}
