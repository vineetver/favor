import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchRegionSummary,
  fetchSignalFacets,
  fetchSignals,
} from "@features/enrichment/api/region";
import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { notFound } from "next/navigation";

interface TissueSignalsPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantTissueSignalsPage({
  params,
}: TissueSignalsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  const [tissueFacets, classFacets, summary, initialSignals] =
    await Promise.all([
      fetchSignalFacets(loc, "tissue_name").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchSignalFacets(loc, "ccre_classification").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchRegionSummary(loc).catch(() => null),
      fetchSignals(loc, {
        sort_by: "max_signal",
        sort_dir: "desc",
        limit: 25,
      }).catch(() => null),
    ]);

  return (
    <div className="space-y-6">
      <SignalHeatmap loc={loc} />

      <TissueSignalsView
        loc={loc}
        totalSignals={summary?.counts.signals ?? 0}
        tissues={tissueFacets.facets.filter(Boolean)}
        classifications={classFacets.facets.filter(Boolean)}
        initialData={initialSignals ?? undefined}
        summary={summary}
        basePath={basePath}
      />
    </div>
  );
}
