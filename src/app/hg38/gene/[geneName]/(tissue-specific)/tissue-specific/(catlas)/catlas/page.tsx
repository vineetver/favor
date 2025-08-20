import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/api";
import { fetchABCPeaksByRegion, fetchABCScoresByRegion } from "@/lib/region/abc/api";
import { CatlasDisplay } from "@/components/features/variant/abc/catlas-display";

interface GeneCatlasPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneCatlasPage({ params }: GeneCatlasPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData) {
    notFound();
  }

  if (!geneData.genomic_position_start || !geneData.genomic_position_end || !geneData.chromosome) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;

  const [peaks, scores] = await Promise.all([
    fetchABCPeaksByRegion(region),
    fetchABCScoresByRegion(region),
  ]);

  return <CatlasDisplay peaks={peaks} scores={scores} />;
}