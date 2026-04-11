import { ChromatinStatesView } from "@features/enrichment/components/chromatin-states-view";
import { loadChromatinStatesData } from "@features/enrichment/loaders";
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
  const data = await loadChromatinStatesData(region.loc, tissueGroup);
  return <ChromatinStatesView loc={region.loc} basePath={basePath} {...data} />;
}
