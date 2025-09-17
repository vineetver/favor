import { notFound } from "next/navigation";
import { ScentDisplay } from "@/components/features/variant/scent/scent-display";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";

interface GeneScentPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneScentPage({ params }: GeneScentPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);

  if (!geneData) {
    notFound();
  }

  if (
    !geneData.genomic_position_start ||
    !geneData.genomic_position_end ||
    !geneData.chromosome
  ) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;

  return <ScentDisplay region={region} />;
}
