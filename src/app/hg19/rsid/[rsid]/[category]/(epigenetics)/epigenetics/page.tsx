import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";
import { getVariantColumns } from "@/lib/variant/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { EpigeneticsDisplay } from "@/components/features/variant/epigenetics/epigenetics-display";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface EpigeneticsPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function EpigeneticsPage({
  params,
}: EpigeneticsPageProps) {
  const { rsid, category } = params;

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

  const variant = selectedVariant;

  const columns = getVariantColumns(category, "epigenetics", "hg19");
  const filteredItems = getFilteredItems(columns!, variant);

  const validItems = filteredItems || [];

  return (
    <div className="space-y-6">
      <EpigeneticsDisplay items={validItems} />
    </div>
  );
}
