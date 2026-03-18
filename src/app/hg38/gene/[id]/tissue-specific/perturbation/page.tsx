import { fetchGene } from "@features/gene/api";
import { fetchCrispr, fetchPerturbSeq } from "@features/perturbation/api";
import type { PerturbationSummary } from "@features/perturbation/types";
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

  const [downstreamRes, upstreamRes, crisprRes] = await Promise.all([
    fetchPerturbSeq(geneSymbol, {
      significant_only: true,
      limit: 100,
    }).catch(() => null),
    fetchPerturbSeq(geneSymbol, {
      effect_gene: geneSymbol,
      significant_only: true,
      limit: 50,
    }).catch(() => null),
    fetchCrispr(geneSymbol, { limit: 100 }).catch(() => null),
  ]);

  const downstream = downstreamRes?.data ?? [];
  const upstream = upstreamRes?.data ?? [];
  const crispr = crisprRes?.data ?? [];

  const downstreamTotalCount =
    downstreamRes?.page_info?.total_count ?? downstream.length;
  const crisprTotalCount =
    crisprRes?.page_info?.total_count ?? crispr.length;

  // Compute summary stats
  const perturbSeqDatasets = new Set(downstream.map((r) => r.dataset_id)).size;
  const essentialIn = crispr.filter((r) => r.is_significant).length;

  const summary: PerturbationSummary = {
    perturbSeqDatasets,
    downstreamTargets: downstreamTotalCount,
    crisprScreens: crisprTotalCount,
    essentialIn,
  };

  return (
    <PerturbationView
      geneSymbol={geneSymbol}
      summary={summary}
      downstream={downstream}
      upstream={upstream}
      crispr={crispr}
      crisprTotalCount={crisprTotalCount}
      downstreamTotalCount={downstreamTotalCount}
    />
  );
}
