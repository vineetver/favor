import { fetchGene } from "@features/gene/api";
import { CategoryDetailView } from "@shared/components/ui/category-detail-view";
import { notFound } from "next/navigation";

interface GeneSubcategoryPageProps {
  params: Promise<{
    id: string;
    subcategory: string;
  }>;
}

export default async function GeneSubcategoryPage({
  params,
}: GeneSubcategoryPageProps) {
  const { id, subcategory } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  return (
    <CategoryDetailView
      data={gene}
      categoryId={subcategory}
      columnGroupSource="gene"
    />
  );
}
