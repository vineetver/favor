import { redirect } from "next/navigation";

interface RegionRedirectProps {
  params: Promise<{ loc: string }>;
}

export default async function RegionRedirect({ params }: RegionRedirectProps) {
  const { loc } = await params;
  redirect(`/hg38/region/${loc}/regulatory/overview`);
}
