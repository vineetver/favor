import { fetchGene } from "@features/gene/api";
import {
  fetchAse,
  fetchAseByTissueGroup,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { AseView } from "@features/enrichment/components/ase-view";
import { notFound } from "next/navigation";

interface AsePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function AsePage({ params, searchParams }: AsePageProps) {
  const { id } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;
  const basePath = `/hg38/gene/${encodeURIComponent(id)}/tissue-specific`;

  const [groupedData, summary, initialData] = await Promise.all([
    !tissueGroup
      ? fetchAseByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchAse(loc, {
          tissue_group: tissueGroup,
          sort_by: "neglog_pvalue",
          sort_dir: "desc",
          limit: 100,
        }).catch(() => null)
      : Promise.resolve(null),
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
      groupedData={groupedData}
    />
  );
}
