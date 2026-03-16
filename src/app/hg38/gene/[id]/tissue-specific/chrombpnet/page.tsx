import { fetchGene } from "@features/gene/api";
import { fetchChromBpnet } from "@features/gene/api/region";
import { ChromBpnetView } from "@features/gene/components/tissue-specific/chrombpnet-view";
import { notFound } from "next/navigation";

interface ChromBpnetPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChromBpnetPage({ params }: ChromBpnetPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

  const initialData = await fetchChromBpnet(loc, { limit: 25 }).catch(() => null);

  return (
    <ChromBpnetView
      loc={loc}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
