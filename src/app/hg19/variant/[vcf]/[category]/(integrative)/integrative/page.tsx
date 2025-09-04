import { notFound } from "next/navigation";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";
import { IntegrativeDisplay } from "@/components/features/variant/integrative/integrative-display";
import { fetchVariant } from "@/lib/variant/api";
import { getVariantColumns } from "@/lib/variant/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";

interface IntegrativePageProps {
  params: {
    vcf: string;
    category: string;
  };
}

export default async function IntegrativePage({
  params,
}: IntegrativePageProps) {
  const { vcf, category } = params;

  const variant = await fetchVariant(vcf);
  if (!variant) {
    notFound();
  }

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
