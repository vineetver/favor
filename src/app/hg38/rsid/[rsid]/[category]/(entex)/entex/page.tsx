import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EntexDisplay } from "@/components/features/variant/entex/entex-display";
import { fetchEntexDefault, fetchEntexPooled } from "@/lib/variant/entex/api";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface EntexPageProps {
  params: {
    rsid: string;
  };
}

export default async function EntexPage({ params }: EntexPageProps) {
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

  const [defaultData, pooledData] = await Promise.all([
    fetchEntexDefault(selectedVariant.variant_vcf),
    fetchEntexPooled(selectedVariant.variant_vcf),
  ]);

  return <EntexDisplay defaultData={defaultData} pooledData={pooledData} />;
}
