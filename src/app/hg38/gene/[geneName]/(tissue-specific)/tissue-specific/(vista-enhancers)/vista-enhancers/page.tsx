import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/api";
import { VistaEnhancerDisplay } from "@/components/features/region/vista-enhancer/vista-enhancer-display";

interface GeneVistaEnhancerPageProps {
  params: {
    geneName: string;
  };
}

export default async function GeneVistaEnhancerPage({ params }: GeneVistaEnhancerPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData) {
    notFound();
  }

  if (!geneData.genomic_position_start || !geneData.genomic_position_end || !geneData.chromosome) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;
  
  return <VistaEnhancerDisplay region={region} />;
}