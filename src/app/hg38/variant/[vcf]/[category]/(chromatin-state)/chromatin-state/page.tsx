import { notFound } from "next/navigation";
import { fetchVariant } from "@/features/variant/api";
import { ChromatinStateView } from "@/features/variant/components/chromatin-state-view";

interface ChromatinStatePageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function ChromatinStatePage({
  params,
}: ChromatinStatePageProps) {
  const { vcf } = await params;

  const variant = await fetchVariant(vcf);

  if (!variant) {
    notFound();
  }

  return <ChromatinStateView data={variant} />;
}
