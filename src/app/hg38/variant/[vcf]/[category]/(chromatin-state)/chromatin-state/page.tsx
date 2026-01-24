import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { ChromatinStateView } from "@features/variant/components/chromatin-state-view";
import { notFound } from "next/navigation";

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
  

  const result = await fetchVariantWithCookie(vcf);

  if (!result) {
    notFound();
  }

  const variant = result.selected;
  const chromatinData = {
    ...variant,
    main: {
      ...(variant.main ?? {}),
      chromhmm: variant.main?.chromhmm ?? {},
    },
  };

  return <ChromatinStateView data={chromatinData} />;
}
