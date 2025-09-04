import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { AncestryDisplay } from "@/components/features/variant/ancestry/ancestry-display";

interface AncestryAfPageProps {
  params: {
    rsid: string;
  };
}

export default async function AncestryAfPage({ params }: AncestryAfPageProps) {
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

  const [exome, genome] = await Promise.all([
    fetchGnomadExome(selectedVariant.variant_vcf),
    fetchGnomadGenome(selectedVariant.variant_vcf),
  ]);

  return (
    <AncestryDisplay variant={selectedVariant} exome={exome} genome={genome} />
  );
}
