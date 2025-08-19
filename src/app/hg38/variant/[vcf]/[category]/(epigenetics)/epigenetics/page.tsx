import { notFound } from "next/navigation";
import { fetchVariant } from "@/lib/variant/api";
import { getVariantColumns } from "@/lib/variant/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { EpigeneticsDisplay } from "@/components/features/variant/epigenetics/epigenetics-display";

interface EpigeneticsPageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function EpigeneticsPage({
  params,
}: EpigeneticsPageProps) {
  const { vcf, category } = params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  const columns = getVariantColumns(category, "epigenetics");
  const filteredItems = getFilteredItems(columns!, variant);

  const validItems = filteredItems || [];

  return (
    <div className="space-y-6">
      <EpigeneticsDisplay items={validItems}  />
    </div>
  );
}
