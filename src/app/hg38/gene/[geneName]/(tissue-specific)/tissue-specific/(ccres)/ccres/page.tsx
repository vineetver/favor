import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { getCCREByRegion } from "@/lib/variant/ccre/api";
import { CCREDisplay } from "@/components/features/browser/ccre/ccre-display";

interface GeneCCREPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneCCREPage({ params }: GeneCCREPageProps) {
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

  const initialData = await getCCREByRegion(region, 0);

  return <CCREDisplay region={region} initialData={initialData} />;
}
