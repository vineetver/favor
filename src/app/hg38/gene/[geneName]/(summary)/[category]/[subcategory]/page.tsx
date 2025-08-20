import { notFound } from "next/navigation";
import { ResponsiveTabs, TabConfig } from "@/components/ui/responsive-tabs";
import { fetchGeneSummary, getSummaryByCategory } from "@/lib/gene/api";
import { GENE_SUMMARY_COLUMNS_MAP } from "@/lib/gene/summary/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { SummaryDashboard } from "@/components/features/shared/summary-dashboard";
import { DataComparisonTable } from "@/components/data-display/data-comparison-table";

interface GeneSummarySubcategoryPageProps {
  params: {
    geneName: string;
    category: string;
    subcategory: string;
  };
}

export default async function GeneSummarySubcategoryPage({
  params,
}: GeneSummarySubcategoryPageProps) {
  const { geneName, category, subcategory } = params;

  const geneSummaryData = await fetchGeneSummary(geneName);
  if (!geneSummaryData) {
    notFound();
  }

  const summaryData = getSummaryByCategory(geneSummaryData, category);
  const columnGroups = GENE_SUMMARY_COLUMNS_MAP[category];
  if (!columnGroups) {
    notFound();
  }

  const currentColumnGroup = columnGroups.find(
    (group) => group.slug === subcategory,
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
            { type: "proportion", header: "% of Total", tooltip: "Percentage of gene's total variant burden" },
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
