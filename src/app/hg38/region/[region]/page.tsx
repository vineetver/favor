import { redirect } from "next/navigation";

export default function RegionPage({ params }: { params: { region: string } }) {
  redirect(`/hg38/region/${params.region}/SNV-summary/allele-distribution`);
}
