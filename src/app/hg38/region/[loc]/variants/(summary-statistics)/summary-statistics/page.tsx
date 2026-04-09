import { fetchRegionVariantStatistics } from "@features/region/api/region-statistics";
import { VariantSummaryStatistics } from "@features/gene/components/variant-summary-statistics";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface RegionSummaryPageProps {
  params: Promise<{ loc: string }>;
}

export default async function RegionSummaryPage({ params }: RegionSummaryPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const result = await fetchRegionVariantStatistics(region.loc);

  // `aggregated` is a flat VariantCounts (not nested). The component only
  // reads `counts`; the surrounding fields are kept to satisfy the type.
  const stats = result?.aggregated
    ? {
        ensemblGeneId: "",
        geneSymbol: region.loc,
        chromosome: result.chromosome,
        startPosition: result.start,
        endPosition: result.end,
        identifiers: {},
        counts: result.aggregated,
      }
    : null;

  return (
    <VariantSummaryStatistics
      stats={stats}
      scope={{ kind: "region", loc: region.loc, bins: result?.bins ?? [] }}
    />
  );
}
