import { fetchGene } from "@features/gene/api";
import { fetchCcreLinks, fetchRegionSummary } from "@features/enrichment/api/region";
import { CcreLinksView } from "@features/enrichment/components/ccre-links-view";
import { notFound } from "next/navigation";

interface CcreLinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function CcreLinksPage({ params }: CcreLinksPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const symbol = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [summary, initialData] = await Promise.all([
    fetchRegionSummary(symbol).catch(() => null),
    fetchCcreLinks(symbol, { limit: 50 }).catch(() => []),
  ]);

  const sources = [...new Set(initialData.map((r) => r.source))].sort();
  const tissues = [...new Set(initialData.map((r) => r.tissue_name))].sort();

  return (
    <CcreLinksView
      gene={symbol}
      initialData={initialData}
      sources={sources}
      tissues={tissues}
      summary={summary}
      basePath={basePath}
    />
  );
}
