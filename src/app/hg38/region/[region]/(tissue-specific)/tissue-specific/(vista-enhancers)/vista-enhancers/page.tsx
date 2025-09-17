import { VistaEnhancerDisplay } from "@/components/features/region/vista-enhancer/vista-enhancer-display";

interface RegionVistaEnhancerPageProps {
  params: {
    region: string;
  };
}

export default async function RegionVistaEnhancerPage({
  params,
}: RegionVistaEnhancerPageProps) {
  const { region } = params;

  return <VistaEnhancerDisplay region={region} />;
}
