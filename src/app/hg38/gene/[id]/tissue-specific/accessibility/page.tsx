import { fetchGene } from "@features/gene/api";
import {
  fetchAccessibility,
  fetchAccessibilityByTissueGroup,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { AccessibilityView } from "@features/enrichment/components/accessibility-view";
import { notFound } from "next/navigation";

interface AccessibilityPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function AccessibilityPage({
  params,
  searchParams,
}: AccessibilityPageProps) {
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
      ? fetchAccessibilityByTissueGroup(loc).catch(() => [])
      : Promise.resolve([]),
    fetchRegionSummary(loc).catch(() => null),
    tissueGroup
      ? fetchAccessibility(loc, {
          tissue_group: tissueGroup,
          sort_by: "max_signal",
          sort_dir: "desc",
          limit: 100,
        }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tissues = initialData
    ? [...new Set(initialData.data.map((r) => r.tissue_name))].sort()
    : [];

  return (
    <AccessibilityView
      loc={loc}
      tissues={tissues}
      totalCount={summary?.counts.accessibility_peaks ?? 0}
      regionCoords={summary?.region ?? ""}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
      groupedData={groupedData}
    />
  );
}
