import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { loadLoopsData } from "@features/enrichment/loaders";
import { LoopsView } from "@features/enrichment/components/loops-view";
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
  const data = await loadLoopsData(loc, tissueGroup);
  return <LoopsView loc={loc} basePath={basePath} {...data} />;
}
