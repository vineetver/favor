import { notFound } from "next/navigation";
import { ResponsiveTabs, TabConfig } from "@/components/ui/responsive-tabs";
import { fetchRegionSummary } from "@/lib/region/summary/api";
import { GENE_SUMMARY_COLUMNS_MAP } from "@/lib/gene/summary/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";
import { SummaryDashboard } from "@/components/features/shared/summary-dashboard";

interface RegionSummarySubcategoryPageProps {
  params: {
    region: string;
    category: string;
    subcategory: string;
  };
}

export default async function RegionSummarySubcategoryPage({
  params,
}: RegionSummarySubcategoryPageProps) {
  const { region, category, subcategory } = params;

  const regionSummaryData = await fetchRegionSummary(region, category);
  if (!regionSummaryData) {
    notFound();
  }

  const columnGroups = GENE_SUMMARY_COLUMNS_MAP[category];
  const currentColumnGroup = columnGroups.find(
    (group) => group.slug === subcategory,
  );
  if (!currentColumnGroup) {
    notFound();
  }

  const filteredData = getFilteredItems(currentColumnGroup, regionSummaryData);

  const tabs: TabConfig[] = [
    {
      id: "visualization",
      label: "Visualization",
      shortLabel: "Chart",
      content: (
        <SummaryDashboard
          data={filteredData!}
          totalVariants={regionSummaryData?.total || 0}
          title="Region Distribution Overview"
        />
      ),
    },
    {
      id: "table",
      label: "Table View",
      shortLabel: "Table",
      content: (
        <DataComparisonTable
          items={filteredData!}
          columns={[
            { type: "value", header: "Count", tooltip: "Number of variants" },
            { type: "proportion", header: "% of Total", tooltip: "Percentage of region's total variant burden" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs
        tabs={tabs}
        defaultValue="table"
        className="w-full"
      />
    </div>
  );
}