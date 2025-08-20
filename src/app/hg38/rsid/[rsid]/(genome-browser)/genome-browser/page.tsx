import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { GenomeBrowserErrorBoundary } from "@/components/features/browser/genome-browser/error-boundary";
import { fetchVariantsByRsid } from "@/lib/variant/api";
import {
  selectVariantFromList,
  validateVariantForRsid,
} from "@/lib/variant/rsid/helpers";

const DynamicGenomeBrowser = dynamic(
  () =>
    import("@/components/features/browser/genome-browser/genome-browser").then(
      (mod) => ({ default: mod.GenomeBrowser }),
    ),
  {
    ssr: false,
  },
);

interface RsidGenomeBrowserPageProps {
  params: {
    rsid: string;
  };
}

export default async function RsidGenomeBrowserPage({
  params,
}: RsidGenomeBrowserPageProps) {
  const { rsid } = params;

  const cookieStore = cookies();
  const selectedVariantVcfFromCookie = cookieStore.get(
    `rsid-${rsid}-variant`,
  )?.value;

  const variants = await fetchVariantsByRsid(rsid);

  if (!variants || variants.length === 0) {
    notFound();
  }

  const validatedVariantVcf = validateVariantForRsid(
    variants,
    selectedVariantVcfFromCookie,
  );

  const selectedVariant = selectVariantFromList(
    variants,
    validatedVariantVcf || undefined,
  );

  if (!selectedVariant) {
    notFound();
  }

  return (
    <GenomeBrowserErrorBoundary>
      <DynamicGenomeBrowser
        vcfParam={selectedVariant.variant_vcf}
        initialTracks={[]}
      />
    </GenomeBrowserErrorBoundary>
  );
}
