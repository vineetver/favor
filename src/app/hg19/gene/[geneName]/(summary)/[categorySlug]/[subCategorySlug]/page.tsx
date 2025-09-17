import { notFound } from "next/navigation";
import { ResponsiveTabs, TabConfig } from "@/components/ui/responsive-tabs";
import {
  fetchHg19GeneSummary,
  getHg19SummaryByCategory,
} from "@/lib/hg19/gene/summary/api";
import { summaryHG19columns } from "@/lib/hg19/gene/summary/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { SummaryDashboard } from "@/components/features/shared/summary-dashboard";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";

interface Hg19GeneSummarySubcategoryPageProps {
  params: {
    geneName: string;
    categorySlug: string;
    subCategorySlug: string;
  };
}

export default async function Hg19GeneSummarySubcategoryPage({
  params,
}: Hg19GeneSummarySubcategoryPageProps) {
  const { geneName, categorySlug, subCategorySlug } = params;

  const geneSummaryData = await fetchHg19GeneSummary(geneName, categorySlug);
  if (!geneSummaryData) {
    notFound();
  }

  const summaryData = getHg19SummaryByCategory(geneSummaryData, categorySlug);
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
          title="Gene Distribution Overview"
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
              tooltip: "Percentage of gene's total variant burden",
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
