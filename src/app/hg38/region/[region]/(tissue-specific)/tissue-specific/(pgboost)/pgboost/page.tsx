import { fetchPGBoostByRegion } from "@/lib/region/pgboost/api";
import { PGBoostDisplay } from "@/lib/shared/pgboost/display";

interface RegionPGBoostPageProps {
  params: {
    region: string;
  };
}

export default async function RegionPGBoostPage({ params }: RegionPGBoostPageProps) {
  const { region } = params;
  
  const data = await fetchPGBoostByRegion(region);
  
  return (
    <PGBoostDisplay
      data={data}
      entityId={region}
      entityType="region"
    />
  );
}