import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { VariantSummary } from "@/components/features/variant/llm-summary/variant-summary";

interface RsidLLMSummaryPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function RsidLLMSummaryPage({ params }: RsidLLMSummaryPageProps) {
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

  return <VariantSummary vcf={selectedVariant.variant_vcf} />;
}
