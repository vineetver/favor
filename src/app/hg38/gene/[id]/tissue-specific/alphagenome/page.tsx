import { notFound } from "next/navigation";
import { fetchGene } from "@features/gene/api";
import { AlphaGenomeGeneScoresView } from "@features/alphagenome/components/gene-scores-view";
import { AlphaGenomeRegionView } from "@features/alphagenome/components/region-view";

interface AlphaGenomeGenePageProps {
  params: Promise<{ id: string }>;
}

export default async function AlphaGenomeGenePage({
  params,
}: AlphaGenomeGenePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  return (
    <div className="space-y-10">
      <AlphaGenomeGeneScoresView
        geneName={gene.gene_name}
        geneId={gene.gene_id_versioned}
        chromosome={gene.chromosome}
        start={gene.start0}
        end={gene.end0_excl}
      />
      <AlphaGenomeRegionView
        chromosome={gene.chromosome}
        start={gene.start0}
        end={gene.end0_excl}
      />
    </div>
  );
}
