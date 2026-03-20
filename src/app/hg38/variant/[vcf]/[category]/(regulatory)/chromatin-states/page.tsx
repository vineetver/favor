import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { loadChromatinStatesData } from "@features/enrichment/loaders";
import { ChromatinStatesView } from "@features/enrichment/components/chromatin-states-view";
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
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;
  const data = await loadChromatinStatesData(loc, tissueGroup);
  return <ChromatinStatesView loc={loc} basePath={basePath} {...data} />;
}
