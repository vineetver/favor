import { ChromBpnetView } from "@features/enrichment/components/chrombpnet-view";
import { loadChromBpnetData } from "@features/enrichment/loaders";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
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
  const data = await loadChromBpnetData(v.variant_vcf, tissueGroup);
  return <ChromBpnetView loc={v.variant_vcf} {...data} />;
}
