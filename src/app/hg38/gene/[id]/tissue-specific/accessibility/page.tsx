import { fetchGene } from "@features/gene/api";
import {
  fetchAccessibility,
  fetchRegionSummary,
} from "@features/gene/api/region";
import { AccessibilityView } from "@features/gene/components/tissue-specific/accessibility-view";
import { notFound } from "next/navigation";

interface AccessibilityPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccessibilityPage({
  params,
}: AccessibilityPageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const loc = gene.gene_symbol || id;

  // Accessibility endpoint has no facets support.
  // Fetch all rows (typically < 200 per gene) to extract tissue list.
  const [summary, initialData] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchAccessibility(loc, {
      sort_by: "max_signal",
      sort_dir: "desc",
      limit: 100,
    }).catch(() => null),
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
    />
  );
}
