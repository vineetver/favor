import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchAccessibility,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { AccessibilityView } from "@features/enrichment/components/accessibility-view";
import { notFound } from "next/navigation";

interface AccessibilityPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantAccessibilityPage({
  params,
}: AccessibilityPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

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
      summary={summary}
      basePath={basePath}
    />
  );
}
