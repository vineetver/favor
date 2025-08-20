import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchABCPeaks, fetchABCScores } from "@/lib/variant/abc/api";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { CatlasDisplay } from "@/components/features/variant/abc/catlas-display";

interface CatlasPageProps {
  params: {
    rsid: string;
  };
}

export default async function CatlasPage({ params }: CatlasPageProps) {
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

  const [peaks, scores] = await Promise.all([
    fetchABCPeaks(selectedVariant.variant_vcf),
    fetchABCScores(selectedVariant.variant_vcf),
  ]);

  return <CatlasDisplay peaks={peaks} scores={scores} />;
}
