import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="h-12 p-1 bg-primary/10 border border-primary/20 rounded-lg grid  grid-cols-2">
          <TabsTrigger
            value="visualization"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Visualization</span>
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Table View</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visualization" className="mt-4">
          <SummaryDashboard
            data={filteredData!}
            totalVariants={summaryData.total}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataComparisonTable
            items={filteredData!}
            columns={[
              { type: "value", header: "Count", tooltip: "Number of variants" },
              { type: "proportion", header: "% of Total", tooltip: "Percentage of gene's total variant burden" },
              // { type: "biologicalContext", header: "Biological Context", tooltip: "Domain-specific biological interpretation" }
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
