import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/api";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { GENE_COLUMNS_MAP } from "@/lib/gene/annotations/columns";
import { ExpressionDisplay } from "@/components/features/gene/expression/expression-display";

interface ExpressionPageProps {
  params: {
    geneName: string;
  };
}

export async function generateMetadata({
  params,
}: ExpressionPageProps): Promise<Metadata> {
  return {
    title: `${params.geneName} - Expression | FAVOR`,
    description: `Gene expression data for ${params.geneName} across multiple tissues and organs`,
  };
}

export default async function ExpressionPage({ params }: ExpressionPageProps) {
  const geneData = await fetchGeneAnnotation(params.geneName);
  if (!geneData) {
    notFound();
  }

  const columns = GENE_COLUMNS_MAP["expression"];

  const filteredItems = getFilteredItems(columns!, geneData);
  return (
    <ExpressionDisplay
      expressionData={filteredItems!}
      geneName={params.geneName}
    />
  );
}
