import { TissueScoresView } from "@features/enrichment/components/tissue-scores-view";
import { loadTissueScoresData } from "@features/enrichment/loaders";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ loc: string }>;
}) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();
  const data = await loadTissueScoresData(region.loc);
  return <TissueScoresView loc={region.loc} {...data} />;
}
