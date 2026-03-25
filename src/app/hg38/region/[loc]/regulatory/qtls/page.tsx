import { loadQtlsData } from "@features/enrichment/loaders";
import { QtlsView } from "@features/enrichment/components/qtls-view";
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
  const data = await loadQtlsData(region.loc, tissueGroup);
  return <QtlsView loc={region.loc} {...data} />;
}
