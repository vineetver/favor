import { EpimapDisplay } from "@/components/features/region/epimap/epimap-display";
import { fetchEpimapByRegion } from "@/lib/region/epimap/api";

interface RegionEpimapPageProps {
  params: {
    region: string;
  };
}

export default async function RegionEpimapPage({
  params,
}: RegionEpimapPageProps) {
  const { region } = params;

  const data = await fetchEpimapByRegion(region);

  return <EpimapDisplay data={data} />;
}
