import { loadTissueSignalsData } from "@features/enrichment/loaders";
import { SignalHeatmap } from "@features/enrichment/components/signal-heatmap";
import { TissueSignalsView } from "@features/enrichment/components/tissue-signals-view";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ loc: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();
  const { tissue_group: tissueGroup } = await searchParams;
  const basePath = `/hg38/region/${encodeURIComponent(loc)}/regulatory`;
  const data = await loadTissueSignalsData(region.loc, tissueGroup);
  return (
    <div className="space-y-6">
      <SignalHeatmap loc={region.loc} />
      <TissueSignalsView loc={region.loc} basePath={basePath} {...data} />
    </div>
  );
}
