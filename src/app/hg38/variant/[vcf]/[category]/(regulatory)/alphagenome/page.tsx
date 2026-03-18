import { notFound } from "next/navigation";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { AlphaGenomeVariantView } from "@features/alphagenome/components/variant-view";

interface AlphaGenomePageProps {
  params: Promise<{ vcf: string }>;
}

export default async function AlphaGenomePage({
  params,
}: AlphaGenomePageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  return <AlphaGenomeVariantView vcf={result.selected.variant_vcf} />;
}
