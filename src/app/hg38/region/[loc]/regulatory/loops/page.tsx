import { loadLoopsData } from "@features/enrichment/loaders";
import { LoopsView } from "@features/enrichment/components/loops-view";
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
  const data = await loadLoopsData(region.loc, tissueGroup);
  return <LoopsView loc={region.loc} basePath={basePath} {...data} />;
}
