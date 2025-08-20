import { ScentDisplay } from "@/components/features/variant/scent/scent-display";

interface RegionScentPageProps {
  params: {
    region: string;
  };
}

export default async function RegionScentPage({ params }: RegionScentPageProps) {
  const { region } = params;
  
  return <ScentDisplay region={region} />;
}