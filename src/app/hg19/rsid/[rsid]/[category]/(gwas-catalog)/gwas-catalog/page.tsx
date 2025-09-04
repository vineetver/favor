import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { GwasCatalogDataDisplay } from "@/components/features/variant/gwas/gwas-catalog-display";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";
import { fetchGWAS } from "@/lib/variant/gwas/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface GwasCatalogPageProps {
  params: {
    rsid: string;
  };
}

export default async function GwasCatalogPage({
  params,
}: GwasCatalogPageProps) {
  const { rsid } = params;

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const variants = await fetchHg19VariantsByRsid(rsid);

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

  const gwas = await fetchGWAS(selectedVariant.variant_vcf);

  return <GwasCatalogDataDisplay variant={selectedVariant} gwas={gwas} />;
}
