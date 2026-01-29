import { CategoryDetailView } from "@shared/components/ui/category-detail-view";
import { notFound } from "next/navigation";
import { fetchGene } from "@features/gene/api";


interface GenePageProps {
  params: Promise<{
    id: string;
    category: string;
    subcategory: string;
  }>;
}

export default async function GenePage({ params }: GenePageProps) {
  const { id, category, subcategory } = await params;

  const gene = await fetchGene(id);

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
