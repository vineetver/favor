import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchChromatinStateFacets,
  fetchChromatinStates,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { ChromatinStatesView } from "@features/enrichment/components/chromatin-states-view";
import { notFound } from "next/navigation";

interface ChromatinStatesPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantChromatinStatesPage({
  params,
}: ChromatinStatesPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  const [tissueFacets, categoryFacets, summary, initialData] =
    await Promise.all([
      fetchChromatinStateFacets(loc, "tissue_name").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchChromatinStateFacets(loc, "state_category").catch(() => ({
        facets: [],
        count: 0,
      })),
      fetchRegionSummary(loc).catch(() => null),
      fetchChromatinStates(loc, {
        sort_by: "position",
        sort_dir: "asc",
        limit: 25,
      }).catch(() => null),
    ]);

  return (
    <ChromatinStatesView
      loc={loc}
      tissues={tissueFacets.facets.filter(Boolean)}
      categories={categoryFacets.facets.filter(Boolean)}
      totalCount={summary?.counts.chromatin_states ?? 0}
      regionCoords={summary?.region ?? ""}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
    />
  );
}
