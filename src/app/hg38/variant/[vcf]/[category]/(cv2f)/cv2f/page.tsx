import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";
import { fetchCV2F } from "@/lib/variant/cv2f/api";
import { getVariantColumns } from "@/lib/variant/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { AnnotationTable } from "@/components/data-display/annotation-table";

interface CV2FPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function CV2FPage({ params }: CV2FPageProps) {
  const { vcf, category } = params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  const cv2fData = await fetchCV2F(variant.rsid);

  const variantWithCv2f = cv2fData ? {
    ...variant,
    Cm: cv2fData.Cm ?? undefined,
    Cv2f: cv2fData.Cv2f ?? undefined,
    LiverCv2f: cv2fData.LiverCv2f ?? undefined,
    BloodCv2f: cv2fData.BloodCv2f ?? undefined,
    BrainCv2f: cv2fData.BrainCv2f ?? undefined,
    Gm12878Cv2f: cv2fData.Gm12878Cv2f ?? undefined,
    K562Cv2f: cv2fData.K562Cv2f ?? undefined,
    HepG2CV2F: cv2fData.HepG2CV2F ?? undefined,
  } : variant;

  const columns = getVariantColumns(category, "cv2f");
  const filteredItems = getFilteredItems(columns!, variantWithCv2f);

  return <AnnotationTable items={filteredItems!} />;
}
