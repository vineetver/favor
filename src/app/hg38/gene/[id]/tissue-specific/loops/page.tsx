import { fetchGene } from "@features/gene/api";
import {
  fetchLoops,
  fetchLoopsByTissueGroup,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { LoopsView } from "@features/enrichment/components/loops-view";
import { notFound } from "next/navigation";

interface LoopsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function LoopsPage({ params, searchParams }: LoopsPageProps) {
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
      ? fetchLoopsByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchLoops(loc, { tissue_group: tissueGroup, limit: 100 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  const assays = initialData
    ? [
        ...new Set(
          initialData.data.flatMap((r) =>
            r.assay_type.split(",").map((a) => a.trim()),
          ),
        ),
      ].sort()
    : [];

  return (
    <LoopsView
      loc={loc}
      tissues={tissues}
      assays={assays}
      totalCount={summary?.counts.loops ?? 0}
      regionCoords={summary?.region ?? ""}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
      groupedData={groupedData}
    />
  );
}
