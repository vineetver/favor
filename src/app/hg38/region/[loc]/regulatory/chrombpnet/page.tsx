import { ChromBpnetView } from "@features/enrichment/components/chrombpnet-view";
import { loadChromBpnetData } from "@features/enrichment/loaders";
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
  const data = await loadChromBpnetData(region.loc, tissueGroup);
  return <ChromBpnetView loc={region.loc} {...data} />;
}
