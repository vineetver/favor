import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchHg19VariantsByRsid } from "@/lib/hg19/rsid/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/hg19/rsid/helpers";
import { fetchAllAnnotations } from "@/lib/hg19/annotations/api";

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

  const variants = await fetchHg19VariantsByRsid(rsid);

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

  const annotations = await fetchAllAnnotations([
    { chromosome: selectedVariant.chromosome, position: selectedVariant.position },
  ]);

  const enrichedVariant = {
    ...selectedVariant,
    ...annotations[0],
  };

  const columns = getVariantColumns(category, subcategory, "hg19");

  const filteredItems = getFilteredItems(columns!, enrichedVariant);

  return <AnnotationTable items={filteredItems!} />;
}
