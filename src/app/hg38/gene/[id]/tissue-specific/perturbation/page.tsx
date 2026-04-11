import { fetchGene } from "@features/gene/api";
import {
  fetchCrispr,
  fetchMave,
  fetchPerturbSeq,
} from "@features/perturbation/api";
import { PerturbationView } from "@features/perturbation/components/perturbation-view";
import { notFound } from "next/navigation";

interface PerturbationPageProps {
  params: Promise<{ id: string }>;
}

export default async function PerturbationPage({
  params,
}: PerturbationPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const geneSymbol = gene.gene_symbol || id;

  const [downstreamRes, upstreamRes, crisprRes, maveRes] = await Promise.all([
    fetchPerturbSeq(geneSymbol, { significant_only: true, limit: 100 }).catch(
      () => null,
    ),
    fetchPerturbSeq(geneSymbol, {
      effect_gene: geneSymbol,
      significant_only: true,
      limit: 50,
    }).catch(() => null),
    fetchCrispr(geneSymbol, { limit: 100 }).catch(() => null),
    fetchMave(geneSymbol, { limit: 100 }).catch(() => null),
  ]);

  // Sort by magnitude — highest impact first
  const downstream = (downstreamRes?.data ?? []).sort(
    (a, b) => Math.abs(b.log2fc) - Math.abs(a.log2fc),
  );
  const upstream = (upstreamRes?.data ?? []).sort(
    (a, b) => Math.abs(b.log2fc) - Math.abs(a.log2fc),
  );
  const crispr = (crisprRes?.data ?? []).sort(
    (a, b) => a.score_value - b.score_value,
  );
  const mave = maveRes?.data ?? [];

  const downstreamTotalCount =
    downstreamRes?.page_info?.total_count ?? downstream.length;
  const crisprTotalCount = crisprRes?.page_info?.total_count ?? crispr.length;
  const maveTotalCount = maveRes?.page_info?.total_count ?? mave.length;

  return (
    <PerturbationView
      geneSymbol={geneSymbol}
      summary={{
        perturbSeqDatasets: new Set(downstream.map((r) => r.dataset_id)).size,
        downstreamTargets: downstreamTotalCount,
        crisprScreens: crisprTotalCount,
        essentialIn: crispr.filter((r) => r.is_significant).length,
        maveScores: maveTotalCount,
      }}
      downstream={downstream}
      upstream={upstream}
      crispr={crispr}
      mave={mave}
      crisprTotalCount={crisprTotalCount}
      downstreamTotalCount={downstreamTotalCount}
      maveTotalCount={maveTotalCount}
    />
  );
}
