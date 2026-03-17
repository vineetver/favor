import { fetchGene } from "@features/gene/api";
import { fetchCcreLinks } from "@features/enrichment/api/region";
import { CcreLinksView } from "@features/enrichment/components/ccre-links-view";
import { notFound } from "next/navigation";

interface CcreLinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function CcreLinksPage({ params }: CcreLinksPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const symbol = gene.gene_symbol || id;

  const initialData = await fetchCcreLinks(symbol, { limit: 50 }).catch(
    () => null,
  );

  return (
    <CcreLinksView
      gene={symbol}
      totalCount={
        initialData?.page_info?.total_count ??
        initialData?.page_info?.count ??
        0
      }
      initialData={initialData ?? undefined}
    />
  );
}
