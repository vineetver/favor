import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { fetchEpimapByRegion } from "@/lib/region/epimap/api";
import { EpimapDisplay } from "@/components/features/region/epimap/epimap-display";

interface GeneEpimapPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneEpimapPage({ params }: GeneEpimapPageProps) {
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

  const data = await fetchEpimapByRegion(region);

  return <EpimapDisplay data={data} />;
}
