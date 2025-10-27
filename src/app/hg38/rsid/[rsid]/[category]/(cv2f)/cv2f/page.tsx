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

  const variant = selectedVariant;

  const cv2fData = await fetchCV2F(variant.rsid);

  const variantWithCv2f = cv2fData
    ? {
        ...variant,
        Cm: typeof cv2fData.Cm === 'string' ? parseFloat(cv2fData.Cm) : cv2fData.Cm,
        Cv2f: typeof cv2fData.Cv2f === 'string' ? parseFloat(cv2fData.Cv2f) : cv2fData.Cv2f,
        LiverCv2f: typeof cv2fData.LiverCv2f === 'string' ? parseFloat(cv2fData.LiverCv2f) : cv2fData.LiverCv2f,
        BloodCv2f: typeof cv2fData.BloodCv2f === 'string' ? parseFloat(cv2fData.BloodCv2f) : cv2fData.BloodCv2f,
        BrainCv2f: typeof cv2fData.BrainCv2f === 'string' ? parseFloat(cv2fData.BrainCv2f) : cv2fData.BrainCv2f,
        Gm12878Cv2f: typeof cv2fData.Gm12878Cv2f === 'string' ? parseFloat(cv2fData.Gm12878Cv2f) : cv2fData.Gm12878Cv2f,
        K562Cv2f: typeof cv2fData.K562Cv2f === 'string' ? parseFloat(cv2fData.K562Cv2f) : cv2fData.K562Cv2f,
        HepG2CV2F: typeof cv2fData.HepG2CV2F === 'string' ? parseFloat(cv2fData.HepG2CV2F) : cv2fData.HepG2CV2F,
      }
    : variant;

  const columns = getVariantColumns("single-cell-tissue", "cv2f");
  const filteredItems = getFilteredItems(columns!, variantWithCv2f);

  return <AnnotationTable items={filteredItems!} />;
}
