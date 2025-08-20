import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { MaleDataDisplay } from "@/components/features/variant/gender/male-display";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface GenderAfMalePageProps {
  params: {
    rsid: string;
  };
}

export default async function GenderAfMalePage({
  params,
}: GenderAfMalePageProps) {
  const { rsid } = params;

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

  const [exome, genome] = await Promise.all([
    fetchGnomadExome(selectedVariant.variant_vcf),
    fetchGnomadGenome(selectedVariant.variant_vcf),
  ]);

  return (
    <MaleDataDisplay variant={selectedVariant} exome={exome} genome={genome} />
  );
}
