import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchEnhancerGeneFacets,
  fetchEnhancerGenes,
  fetchRegionSummary,
} from "@features/enrichment/api/region";
import { EnhancerGenesView } from "@features/enrichment/components/enhancer-genes-view";
import { notFound } from "next/navigation";

interface EnhancerGenesPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantEnhancerGenesPage({
  params,
}: EnhancerGenesPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const loc = `chr${v.chromosome}:${v.position}-${v.position}`;
  const basePath = `/hg38/variant/${encodeURIComponent(vcf)}/regulatory`;

  const [geneFacets, tissueFacets, summary, initialData] = await Promise.all([
    fetchEnhancerGeneFacets(loc, "gene_symbol").catch(() => ({
      facets: [],
      count: 0,
    })),
    fetchEnhancerGeneFacets(loc, "tissue_name").catch(() => ({
      facets: [],
      count: 0,
    })),
    fetchRegionSummary(loc).catch(() => null),
    fetchEnhancerGenes(loc, {
      method: "abc",
      sort_by: "score",
      sort_dir: "desc",
      limit: 25,
    }).catch(() => null),
  ]);

  return (
    <EnhancerGenesView
      loc={loc}
      totalCount={summary?.counts.enhancer_genes ?? 0}
      genes={geneFacets.facets.filter(Boolean)}
      tissues={tissueFacets.facets.filter(Boolean)}
      initialData={initialData ?? undefined}
      summary={summary}
      basePath={basePath}
    />
  );
}
