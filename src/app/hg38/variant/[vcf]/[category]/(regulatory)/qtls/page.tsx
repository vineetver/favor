import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { loadQtlsData } from "@features/enrichment/loaders";
import { QtlsView } from "@features/enrichment/components/qtls-view";
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
  const data = await loadQtlsData(v.variant_vcf, tissueGroup);
  return <QtlsView loc={v.variant_vcf} {...data} />;
}
