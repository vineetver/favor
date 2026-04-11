import { TissueScoresView } from "@features/enrichment/components/tissue-scores-view";
import { loadTissueScoresData } from "@features/enrichment/loaders";
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
  const data = await loadTissueScoresData(v.variant_vcf);
  return <TissueScoresView loc={v.variant_vcf} {...data} />;
}
