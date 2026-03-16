import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchRegionSummary,
  fetchValidatedEnhancers,
} from "@features/enrichment/api/region";
import { ValidatedEnhancersView } from "@features/enrichment/components/validated-enhancers-view";
import { notFound } from "next/navigation";

interface ValidatedEnhancersPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantValidatedEnhancersPage({
  params,
}: ValidatedEnhancersPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  const [summary, data] = await Promise.all([
    fetchRegionSummary(loc).catch(() => null),
    fetchValidatedEnhancers(loc).catch(() => []),
  ]);

  return (
    <ValidatedEnhancersView
      loc={loc}
      data={data}
      regionCoords={summary?.region ?? ""}
      summary={summary}
      basePath={basePath}
    />
  );
}
