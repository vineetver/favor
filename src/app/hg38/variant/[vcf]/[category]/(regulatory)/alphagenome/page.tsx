import { AlphaGenomeVariantView } from "@features/alphagenome/components/variant-view";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

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
