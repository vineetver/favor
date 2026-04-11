import { ValidatedEnhancersView } from "@features/enrichment/components/validated-enhancers-view";
import { loadValidatedEnhancersData } from "@features/enrichment/loaders";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ vcf: string }>;
}) {
  const { vcf } = await params;
  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();
  const v = result.selected;
  const loc = `${v.chromosome}-${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;
  const data = await loadValidatedEnhancersData(loc);
  return <ValidatedEnhancersView loc={loc} basePath={basePath} {...data} />;
}
