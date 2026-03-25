import {
  fetchCcreLinks,
  fetchCcreLinksByTissueGroup,
} from "@features/enrichment/api/region";
import { CcreLinksView } from "@features/enrichment/components/ccre-links-view";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface CcreLinksPageProps {
  params: Promise<{ loc: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}

export default async function CcreLinksPage({
  params,
  searchParams,
}: CcreLinksPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();
  const { tissue_group: tissueGroup } = await searchParams;

  const [groupedData, initialData] = await Promise.all([
    !tissueGroup
      ? fetchCcreLinksByTissueGroup(region.loc).catch(() => [])
      : Promise.resolve([]),
    tissueGroup
      ? fetchCcreLinks(region.loc, { tissue_group: tissueGroup, limit: 50 }).catch(
          () => null,
        )
      : Promise.resolve(null),
  ]);

  return (
    <CcreLinksView
      gene={region.loc}
      totalCount={
        initialData?.page_info?.total_count ??
        initialData?.page_info?.count ??
        0
      }
      initialData={initialData ?? undefined}
      groupedData={groupedData}
    />
  );
}
