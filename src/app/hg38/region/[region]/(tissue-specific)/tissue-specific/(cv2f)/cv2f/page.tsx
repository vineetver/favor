
import { CV2FDisplay } from "@/components/features/variant/cv2f/cv2f-display";
import { fetchCV2FByRegion } from "@/lib/variant/cv2f/api";

interface RegionCV2FPageProps {
  params: {
    region: string;
  };
}

export default async function RegionCV2FPage({ params }: RegionCV2FPageProps) {
  const { region } = params;

  const data = await fetchCV2FByRegion(region);

  return <CV2FDisplay data={data} />;
}