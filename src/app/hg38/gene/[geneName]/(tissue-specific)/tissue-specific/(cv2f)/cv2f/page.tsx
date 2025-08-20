import { notFound } from "next/navigation";
import { CV2FDisplay } from "@/components/features/variant/cv2f/cv2f-display";
import { fetchCV2FByRegion } from "@/lib/variant/cv2f/api";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";

interface GeneCV2FPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneCV2FPage({ params }: GeneCV2FPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData) {
    notFound();
  }

  if (!geneData.genomic_position_start || !geneData.genomic_position_end || !geneData.chromosome) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;

  const data = await fetchCV2FByRegion(region);

  return <CV2FDisplay data={data} />;
}