import { CatlasDisplay } from "@/components/features/variant/abc/catlas-display";
import {
  fetchABCPeaksByRegion,
  fetchABCScoresByRegion,
} from "@/lib/region/abc/api";

interface RegionCatlasPageProps {
  params: {
    region: string;
  };
}

export default async function RegionCatlasPage({
  params,
}: RegionCatlasPageProps) {
  const { region } = params;

  const [peaks, scores] = await Promise.all([
    fetchABCPeaksByRegion(region),
    fetchABCScoresByRegion(region),
  ]);

  return <CatlasDisplay peaks={peaks} scores={scores} />;
}
