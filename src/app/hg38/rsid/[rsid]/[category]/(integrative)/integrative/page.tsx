import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="h-12 p-1 bg-primary/10 border border-primary/20 rounded-lg">
          <TabsTrigger
            value="table"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Annotation Table</span>
            {validItems.length > 0 && (
              <Badge className="text-xs font-mono ml-1 flex-shrink-0 bg-primary/20 text-primary-foreground border-primary/30">
                {validItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="visualization"
            className="flex items-center gap-1 sm:gap-2 font-medium px-2 sm:px-4 py-2 flex-shrink-0 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-primary/5"
          >
            <span>Visualization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <DataComparisonTable
            items={validItems}
            leftColumn="value"
            rightColumn="percentile"
            leftColumnHeader="Integrative Score"
            rightColumnHeader="Percentile"
            rightColumnTooltip="Score transformed to percentile scale using formula: 10^(score * -0.1) * 100. Higher scores result in lower percentiles, indicating greater functional impact or statistical significance."
          />
        </TabsContent>

        <TabsContent value="visualization" className="mt-4">
          <IntegrativeDisplay items={validItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
