import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchLoops,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { LoopsView } from "@features/enrichment/components/loops-view";
import { notFound } from "next/navigation";

interface LoopsPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantLoopsPage({ params }: LoopsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

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
