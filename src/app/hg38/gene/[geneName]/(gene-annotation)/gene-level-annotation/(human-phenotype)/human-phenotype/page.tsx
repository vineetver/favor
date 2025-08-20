import { notFound } from "next/navigation";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { GENE_COLUMNS_MAP } from "@/lib/gene/annotations/columns";
import { getFilteredItems } from "@/lib/annotations/helpers";
import { NoDataState } from "@/components/ui/error-states";
import { Card, CardContent } from "@/components/ui/card";
import { AnnotationTable } from "@/components/data-display/annotation-table";

interface HumanPhenotypePageProps {
  params: {
    geneName: string;
  };
}

export default async function HumanPhenotypePage({
  params,
}: HumanPhenotypePageProps) {
  const geneData = await fetchGeneAnnotation(params.geneName);
  if (!geneData) {
    notFound();
  }

  const humanPhenotypeColumns = GENE_COLUMNS_MAP["human-phenotype"];
  if (!humanPhenotypeColumns) return notFound();

  // Extract MIM columns (first 4 items: MIM Disease, MIM Phenotype ID, Inheritance, Pheno Key)
  const mimColumns = {
    ...humanPhenotypeColumns,
    items: humanPhenotypeColumns.items.slice(0, 4),
  };

  // Extract non-MIM columns (remaining items)
  const nonMimColumns = {
    ...humanPhenotypeColumns,
    items: humanPhenotypeColumns.items.slice(4),
  };

  const filteredMimItems = getFilteredItems(mimColumns, geneData);
  const filteredNonMimItems = getFilteredItems(nonMimColumns, geneData);

  if (!filteredMimItems && !filteredNonMimItems) {
    return <NoDataState categoryName="human phenotype annotation" />;
  }

  return (
    <>
      {filteredMimItems && (
        <Card className="mb-4">
          <CardContent className="p-0">
            <div className="overflow-hidden break-words">
              <dl className="grid grid-cols-1 sm:grid-cols-4">
                {filteredMimItems.map((item, index) => {
                  if (item.value === undefined) return null;
                  return (
                    <div
                      key={`mimitems ${index}`}
                      className="flex flex-col text-sm font-normal sm:px-6 sm:py-5"
                    >
                      <div className="flex items-center">
                        <dt className="text-sm font-semibold">{item.header}:</dt>
                      </div>
                      <dd className="mt-2 text-sm lg:col-span-2">{item.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredNonMimItems && <AnnotationTable items={filteredNonMimItems} />}
    </>
  );
}
