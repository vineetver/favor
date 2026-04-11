import { ValidatedEnhancersView } from "@features/enrichment/components/validated-enhancers-view";
import { loadValidatedEnhancersData } from "@features/enrichment/loaders";
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
  const basePath = `/hg38/region/${encodeURIComponent(loc)}/regulatory`;
  const data = await loadValidatedEnhancersData(region.loc);
  return (
    <ValidatedEnhancersView loc={region.loc} basePath={basePath} {...data} />
  );
}
