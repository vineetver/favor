import { CCREDisplay } from "@/components/features/browser/ccre/ccre-display";
import { getCCREByRegion } from "@/lib/variant/ccre/api";


interface RegionCCREPageProps {
  params: {
    region: string;
  };
}

export default async function RegionCCREPage({ params }: RegionCCREPageProps) {
  const { region } = params;

  const initialData = await getCCREByRegion(region, 0);

  return <CCREDisplay region={region} initialData={initialData} />;
}