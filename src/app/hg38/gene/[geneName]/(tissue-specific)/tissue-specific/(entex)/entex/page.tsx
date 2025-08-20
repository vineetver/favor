import { notFound } from "next/navigation";
import { EntexDisplay } from "@/components/features/variant/entex/entex-display";
import { fetchEntexDefaultByRegion, fetchEntexPooledByRegion } from "@/lib/variant/entex/api";
import { fetchGeneAnnotation } from "@/lib/gene/api";

interface GeneEntexPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneEntexPage({ params }: GeneEntexPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData) {
    notFound();
  }

  if (!geneData.genomic_position_start || !geneData.genomic_position_end || !geneData.chromosome) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;

  const [defaultData, pooledData] = await Promise.all([
    fetchEntexDefaultByRegion(region),
    fetchEntexPooledByRegion(region),
  ]);

  return <EntexDisplay defaultData={defaultData} pooledData={pooledData} />;
}