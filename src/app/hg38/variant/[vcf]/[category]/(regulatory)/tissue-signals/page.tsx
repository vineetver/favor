import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { loadTissueSignalsData } from "@features/enrichment/loaders";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ vcf: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}) {
  const { vcf } = await params;
  const { tissue_group: tissueGroup } = await searchParams;
  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();
  const v = result.selected;
  const loc = `${v.chromosome}-${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;
  const data = await loadTissueSignalsData(loc, tissueGroup);
  return (
    <div className="space-y-6">
      <SignalHeatmap loc={loc} />
      <TissueSignalsView loc={loc} basePath={basePath} {...data} />
    </div>
  );
}
