import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";
import { fetchCV2F } from "@/lib/variant/cv2f/api";

interface CV2FRsidPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function CV2FRsidPage({ params }: CV2FRsidPageProps) {
  const { rsid, category } = params;

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

  const variant = selectedVariant;

  const cv2fData = await fetchCV2F(variant.rsid);

  const variantWithCv2f = cv2fData
    ? {
        ...variant,
        Cm: cv2fData.Cm ?? undefined,
        Cv2f: cv2fData.Cv2f ?? undefined,
        LiverCv2f: cv2fData.LiverCv2f ?? undefined,
        BloodCv2f: cv2fData.BloodCv2f ?? undefined,
        BrainCv2f: cv2fData.BrainCv2f ?? undefined,
        Gm12878Cv2f: cv2fData.Gm12878Cv2f ?? undefined,
        K562Cv2f: cv2fData.K562Cv2f ?? undefined,
        HepG2CV2F: cv2fData.HepG2CV2F ?? undefined,
      }
    : variant;

  const columns = getVariantColumns(category, "cv2f");
  const filteredItems = getFilteredItems(columns!, variantWithCv2f);

  return <AnnotationTable items={filteredItems!} />;
}
