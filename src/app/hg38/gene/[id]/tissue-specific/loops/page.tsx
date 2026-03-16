import { fetchGene } from "@features/gene/api";
import {
  fetchLoops,
  fetchRegionSummary,
} from "@features/gene/api/region";
import { LoopsView } from "@features/gene/components/tissue-specific/loops-view";
import { notFound } from "next/navigation";

interface LoopsPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoopsPage({ params }: LoopsPageProps) {
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
    fetchLoops(loc, { limit: 100 }).catch(() => null),
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
    />
  );
}
