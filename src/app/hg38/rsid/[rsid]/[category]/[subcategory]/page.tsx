import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface RsidPageProps {
  params: {
    rsid: string;
    category: string;
    subcategory: string;
  };
}

export default async function RsidPage({ params }: RsidPageProps) {
  const { rsid, category, subcategory } = params;

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const variants = await fetchVariantsByRsid(rsid);

  if (!variants || variants.length === 0) {
    notFound();
  }

  // Validate that the stored variant actually exists for this rsID
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

  const columns = getVariantColumns(category, subcategory);

  const filteredItems = getFilteredItems(columns!, selectedVariant);

  return <AnnotationTable items={filteredItems!} />;
}
