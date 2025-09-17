import { EntexDisplay } from "@/components/features/variant/entex/entex-display";
import {
  fetchEntexDefaultByRegion,
  fetchEntexPooledByRegion,
} from "@/lib/variant/entex/api";

interface RegionEntexPageProps {
  params: {
    region: string;
  };
}

export default async function RegionEntexPage({
  params,
}: RegionEntexPageProps) {
  const { region } = params;

  const [defaultData, pooledData] = await Promise.all([
    fetchEntexDefaultByRegion(region),
    fetchEntexPooledByRegion(region),
  ]);

  return <EntexDisplay defaultData={defaultData} pooledData={pooledData} />;
}
