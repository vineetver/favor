import { fetchGene } from "@features/gene/api";
import { ConstraintsOverview } from "@features/gene/components/constraints-overview";
import { notFound } from "next/navigation";

interface ConstraintsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConstraintsPage({
  params,
}: ConstraintsPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  return <ConstraintsOverview gene={gene} />;
}
