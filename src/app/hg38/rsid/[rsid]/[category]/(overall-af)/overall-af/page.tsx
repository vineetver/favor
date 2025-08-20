import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { AnnotationTable } from "@/components/data-display/annotation-table";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface OverallAfPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function OverallAfPage({ params }: OverallAfPageProps) {
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

  const [exome, genome] = await Promise.all([
    fetchGnomadExome(selectedVariant.variant_vcf),
    fetchGnomadGenome(selectedVariant.variant_vcf),
  ]);

  selectedVariant.gnomad41_genome = genome?.af;
  selectedVariant.gnomad41_exome = exome?.af;
  const columns = getVariantColumns(category, "overall-af");
  const filteredItems = getFilteredItems(columns!, selectedVariant);

  const validItems = filteredItems || [];

  return (
    <div className="space-y-6">
      <AnnotationTable items={validItems} />
    </div>
  );
}
