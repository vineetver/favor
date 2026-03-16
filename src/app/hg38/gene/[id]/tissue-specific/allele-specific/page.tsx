import { fetchGene } from "@features/gene/api";
import {
  fetchAse,
  fetchRegionSummary,
} from "@features/gene/api/region";
import { AseView } from "@features/gene/components/tissue-specific/ase-view";
import { notFound } from "next/navigation";

interface AsePageProps {
  params: Promise<{ id: string }>;
}

export default async function AsePage({ params }: AsePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [summary, initialData] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchAse(loc, {
      sort_by: "position",
      sort_dir: "asc",
      limit: 100,
    }).catch(() => null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  const assays = initialData
    ? [...new Set(initialData.data.map((r) => r.assay))].sort()
    : [];

  return (
    <AseView
      loc={loc}
      tissues={tissues}
      assays={assays}
      totalCount={summary?.counts.ase ?? 0}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
    />
  );
}
