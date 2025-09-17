import { redirect } from "next/navigation";

interface RegionRedirectProps {
  params: {
    region: string;
  };
}

export default function RegionRedirect({ params }: RegionRedirectProps) {
  const { region } = params;
  redirect(`/hg19/region/${region}/SNV-summary/allele-distribution`);
}
