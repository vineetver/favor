import { MethylationView } from "@features/enrichment/components/methylation-view";
import { loadMethylationData } from "@features/enrichment/loaders";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

export default async function VariantMethylationPage({
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

  const ref = result.selected.variant_vcf;
  const data = await loadMethylationData(ref, tissueGroup);

  return <MethylationView ref_id={ref} {...data} />;
}
