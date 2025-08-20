import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { GENE_NAVIGATION } from "@/lib/gene/navigation";
import { GENE_COLUMNS_MAP } from "@/lib/gene/annotations/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { AnnotationTable } from "@/components/data-display/annotation-table";

interface GeneSubcategoryPageProps {
  params: {
    geneName: string;
    category: string;
    subcategory: string;
  };
}

export default async function GeneSubcategoryPage({
  params,
}: GeneSubcategoryPageProps) {
  const { geneName, subcategory } = params;
  const category = "gene-level-annotation";

  const currentCategory = GENE_NAVIGATION.find((cat) => cat.slug === category);
  if (!currentCategory) {
    notFound();
  }

  const currentSubcategory = currentCategory.subCategories.find(
    (sub) => sub.slug === subcategory,
  );
  if (!currentSubcategory) {
    notFound();
  }

  const geneData = await fetchGeneAnnotation(geneName);
  if (!geneData) {
    notFound();
  }

  const columns = GENE_COLUMNS_MAP[subcategory];
  const filteredData = getFilteredItems(columns!, geneData);

  return <AnnotationTable items={filteredData!} />;
}
