import { redirect } from "next/navigation";

interface TissueSpecificPageProps {
  params: Promise<{ id: string }>;
}

export default async function TissueSpecificPage({
  params,
}: TissueSpecificPageProps) {
  const { id } = await params;
  redirect(`/hg38/gene/${encodeURIComponent(id)}/tissue-specific/overview`);
}
