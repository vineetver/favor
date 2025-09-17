import { notFound } from "next/navigation";
import { getHG19SubCategoryBySlug } from "@/lib/hg19/gene/navigation";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { GENE_COLUMNS_MAP } from "@/lib/gene/annotations/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";

interface GeneSubcategoryPageProps {
  params: {
    geneName: string;
    subcategory: string;
  };
}

export default async function GeneSubcategoryPage({
  params,
}: GeneSubcategoryPageProps) {
  const { geneName, subcategory } = params;

  const subCategoryData = getHG19SubCategoryBySlug(
    "gene-level-annotation",
    subcategory,
  );
  if (!subCategoryData) {
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
