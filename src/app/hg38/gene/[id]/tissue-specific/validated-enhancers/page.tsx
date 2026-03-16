import { fetchGene } from "@features/gene/api";
import {
  fetchRegionSummary,
  fetchValidatedEnhancers,
} from "@features/enrichment/api/region";
import { ValidatedEnhancersView } from "@features/enrichment/components/validated-enhancers-view";
import { notFound } from "next/navigation";

interface ValidatedEnhancersPageProps {
  params: Promise<{ id: string }>;
}

export default async function ValidatedEnhancersPage({
  params,
}: ValidatedEnhancersPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [summary, data] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchValidatedEnhancers(loc).catch(() => []),
  ]);

  return (
    <ValidatedEnhancersView
      loc={loc}
      data={data}
      regionCoords={summary?.region ?? ""}
      summary={summary}
      basePath={basePath}
    />
  );
}
