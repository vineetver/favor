import { fetchGene } from "@features/gene/api";
import {
  fetchScoresetDetail,
  fetchScoresetVariants,
} from "@features/mavedb/api";
import { ScoresetDetailView } from "@features/mavedb/components/detail/scoreset-detail-view";
import { MAVE_VARIANTS_PAGE_LIMIT } from "@features/mavedb/constants";
import { notFound } from "next/navigation";

interface DetailPageProps {
  params: Promise<{ id: string; urn: string }>;
}

export default async function ScoresetDetailPage({ params }: DetailPageProps) {
  const { id, urn } = await params;

  const [geneResponse, detail, variantsInitial] = await Promise.all([
    fetchGene(id),
    fetchScoresetDetail(urn).catch(() => null),
    fetchScoresetVariants(urn, { limit: MAVE_VARIANTS_PAGE_LIMIT }).catch(
      () => undefined,
    ),
  ]);

  const gene = geneResponse?.data;
  if (!gene || !detail) notFound();

  return (
    <ScoresetDetailView
      geneSymbol={gene.gene_symbol || id}
      detail={detail}
      variantsInitial={variantsInitial}
    />
  );
}
