import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCCREByVCF } from "@/lib/variant/ccre/api";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { CCREDisplay } from "@/components/features/browser/ccre/ccre-display";

interface CCREPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function CCREPage({ params }: CCREPageProps) {
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

  const initialData = await getCCREByVCF(selectedVariant.variant_vcf, 0);

  return (
    <CCREDisplay vcf={selectedVariant.variant_vcf} initialData={initialData} />
  );
}
