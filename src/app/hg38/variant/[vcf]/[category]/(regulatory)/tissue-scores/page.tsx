import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchTissueScores } from "@features/enrichment/api/region";
import { TissueScoresView } from "@features/enrichment/components/tissue-scores-view";
import { notFound } from "next/navigation";

interface TissueScoresPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantTissueScoresPage({
  params,
}: TissueScoresPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const ref = result.selected.variant_vcf;

  const initialData = await fetchTissueScores(ref, { limit: 25 }).catch(
    () => null,
  );

  return (
    <TissueScoresView
      loc={ref}
      totalCount={initialData?.page_info?.total_count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
