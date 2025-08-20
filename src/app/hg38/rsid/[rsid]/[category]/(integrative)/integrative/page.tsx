import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";
import { IntegrativeDisplay } from "@/components/features/variant/integrative/integrative-display";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { getVariantColumns } from "@/lib/variant/columns";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

interface IntegrativeRsidPageProps {
  params: {
    rsid: string;
    category: string;
  };
}

export default async function IntegrativeRsidPage({
  params,
}: IntegrativeRsidPageProps) {
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

  const columns = getVariantColumns(category, "integrative");
  const filteredItems = getFilteredItems(columns!, variant);

  const validItems = filteredItems || [];

  const tabs = [
    {
      id: "table",
      label: "Annotation Table",
      shortLabel: "Table",
      count: validItems.length,
      content: (
        <DataComparisonTable
          items={validItems}
          columns={[
            {
              type: "value" as const,
              header: "Integrative Score",
              tooltip:
                "Combined functional impact score integrating multiple prediction algorithms and conservation metrics",
            },
            {
              type: "percentile" as const,
              header: "Percentile",
              tooltip:
                "Score transformed to percentile scale using formula: 10^(score * -0.1) * 100. Higher scores result in lower percentiles, indicating greater functional impact or statistical significance.",
            },
          ]}
        />
      ),
    },
    {
      id: "visualization",
      label: "Data Visualization",
      shortLabel: "Chart",
      content: <IntegrativeDisplay items={validItems} />,
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} defaultValue="table" variant="simple" />
    </div>
  );
}
