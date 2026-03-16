import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchAse,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { AseView } from "@features/enrichment/components/ase-view";
import { notFound } from "next/navigation";

interface AsePageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantAsePage({ params }: AsePageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  const [summary, initialData] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchAse(loc, {
      sort_by: "neglog_pvalue",
      sort_dir: "desc",
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
