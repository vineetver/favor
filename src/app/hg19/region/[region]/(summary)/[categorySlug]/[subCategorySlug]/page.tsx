import { notFound } from "next/navigation";
import { ResponsiveTabs, TabConfig } from "@/components/ui/responsive-tabs";
import {
  fetchHg19RegionSummary,
  getHg19SummaryByCategory,
} from "@/lib/hg19/region/summary/api";
import { summaryHG19columns } from "@/lib/hg19/region/summary/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { SummaryDashboard } from "@/components/features/shared/summary-dashboard";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";

interface Hg19RegionSummarySubcategoryPageProps {
  params: {
    region: string;
    categorySlug: string;
    subCategorySlug: string;
  };
}

export default async function Hg19RegionSummarySubcategoryPage({
  params,
}: Hg19RegionSummarySubcategoryPageProps) {
  const { region, categorySlug, subCategorySlug } = params;

  const regionSummaryData = await fetchHg19RegionSummary(region, categorySlug);
  if (!regionSummaryData) {
    notFound();
  }

  const summaryData = getHg19SummaryByCategory(regionSummaryData, categorySlug);
  const columnGroups = summaryHG19columns;
  if (!columnGroups) {
    notFound();
  }

  const currentColumnGroup = columnGroups.find(
    (group) => group.slug === subCategorySlug,
  );
  if (!currentColumnGroup) {
    notFound();
  }

  const filteredData = getFilteredItems(currentColumnGroup, summaryData);

  const tabs: TabConfig[] = [
    {
      id: "visualization",
      label: "Visualization",
      shortLabel: "Chart",
      content: (
        <SummaryDashboard
          data={filteredData!}
          totalVariants={summaryData.total}
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
            {
              type: "proportion",
              header: "% of Total",
              tooltip: "Percentage of region's total variant burden",
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} defaultValue="table" className="w-full" />
    </div>
  );
}
