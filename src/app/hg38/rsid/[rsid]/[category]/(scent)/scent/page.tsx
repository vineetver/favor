import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ScentDisplay } from "@/components/features/variant/scent/scent-display";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface ScentPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function ScentPage({ params }: ScentPageProps) {
  const { rsid, category } = params;

  if (category !== "single-cell-tissue") {
    notFound();
  }

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const variants = await fetchVariantsByRsid(rsid);
  if (!variants || variants.length === 0) {
    notFound();
  }

  const validatedVariantVcf = validateVariantForRsid(
    variants,
    selectedVariantVcfFromCookie,
  );
  const selectedVariant = selectVariantFromList(
    variants,
    validatedVariantVcf || undefined,
  );
  if (!selectedVariant) {
    notFound();
  }

  const initialData = await fetchScentTissueByVCF(
    selectedVariant.variant_vcf,
    0,
  );

  return (
    <ScentDisplay vcf={selectedVariant.variant_vcf} initialData={initialData} />
  );
}
