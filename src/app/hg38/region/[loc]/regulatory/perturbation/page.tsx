import { fetchCrispr, fetchMave, fetchPerturbSeq } from "@features/perturbation/api";
import { PerturbationView } from "@features/perturbation/components/perturbation-view";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface PerturbationPageProps {
  params: Promise<{ loc: string }>;
}

export default async function PerturbationPage({ params }: PerturbationPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const [downstreamRes, crisprRes, maveRes] = await Promise.all([
    fetchPerturbSeq(region.loc, { significant_only: true, limit: 100 }).catch(() => null),
    fetchCrispr(region.loc, { limit: 100 }).catch(() => null),
    fetchMave(region.loc, { limit: 100 }).catch(() => null),
  ]);

  const downstream = (downstreamRes?.data ?? []).sort((a, b) => Math.abs(b.log2fc) - Math.abs(a.log2fc));
  const crispr = (crisprRes?.data ?? []).sort((a, b) => a.score_value - b.score_value);
  const mave = maveRes?.data ?? [];

  const downstreamTotalCount = downstreamRes?.page_info?.total_count ?? downstream.length;
  const crisprTotalCount = crisprRes?.page_info?.total_count ?? crispr.length;
  const maveTotalCount = maveRes?.page_info?.total_count ?? mave.length;

  return (
    <PerturbationView
      geneSymbol={region.loc}
      summary={{
        perturbSeqDatasets: new Set(downstream.map((r) => r.dataset_id)).size,
        downstreamTargets: downstreamTotalCount,
        crisprScreens: crisprTotalCount,
        essentialIn: crispr.filter((r) => r.is_significant).length,
        maveScores: maveTotalCount,
      }}
      downstream={downstream}
      upstream={[]}
      crispr={crispr}
      mave={mave}
      crisprTotalCount={crisprTotalCount}
      downstreamTotalCount={downstreamTotalCount}
      maveTotalCount={maveTotalCount}
    />
  );
}
