import { AlphaGenomeRegionView } from "@features/alphagenome/components/region-view";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface AlphaGenomeRegionPageProps {
  params: Promise<{ loc: string }>;
}

export default async function AlphaGenomeRegionPage({
  params,
}: AlphaGenomeRegionPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();

  return (
    <div className="space-y-10">
      <AlphaGenomeRegionView
        chromosome={region.chromosome}
        start={region.start}
        end={region.end}
      />
    </div>
  );
}
