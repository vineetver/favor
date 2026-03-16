import { fetchGene } from "@features/gene/api";
import { fetchQtls } from "@features/gene/api/region";
import { QtlsView } from "@features/gene/components/tissue-specific/qtls-view";
import { notFound } from "next/navigation";

interface QtlsPageProps {
  params: Promise<{ id: string }>;
}

export default async function QtlsPage({ params }: QtlsPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const loc = gene.gene_symbol || id;

  const initialData = await fetchQtls(loc, { limit: 25 }).catch(() => null);

  return (
    <QtlsView
      loc={loc}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
