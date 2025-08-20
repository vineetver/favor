import { notFound } from "next/navigation";
import { fetchPGBoostByGene } from "@/lib/variant/pgboost/api";
import { fetchGeneAnnotation } from "@/lib/gene/api";
import { PGBoostDisplay } from "@/lib/shared/pgboost/display";

interface GenePGBoostPageProps {
  params: {
    geneName: string;
  };
}

export default async function GenePGBoostPage({ params }: GenePGBoostPageProps) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);
  
  if (!geneData) {
    notFound();
  }

  const data = await fetchPGBoostByGene(geneName);
  
  return (
    <PGBoostDisplay
      data={data}
      entityId={geneName}
      entityType="gene"
    />
  );
}