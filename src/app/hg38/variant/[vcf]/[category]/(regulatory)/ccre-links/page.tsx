import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { fetchCcreGeneLinks } from "@features/enrichment/api/region";
import { VariantCcreLinksView } from "@features/enrichment/components/variant-ccre-links-view";
import { notFound } from "next/navigation";

interface CcreLinksPageProps {
  params: Promise<{ vcf: string }>;
}

export default async function VariantCcreLinksPage({
  params,
}: CcreLinksPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const accession = v.ccre?.accessions;

  if (!accession) {
    return <VariantCcreLinksView ccreId="—" totalCount={0} />;
  }

  // Use the first cCRE accession (primary overlap)
  const ccreId = accession.split(",")[0].trim();

  const initialData = await fetchCcreGeneLinks(ccreId, { limit: 50 }).catch(
    () => null,
  );

  return (
    <VariantCcreLinksView
      ccreId={ccreId}
      totalCount={initialData?.page_info?.total_count ?? initialData?.page_info?.count ?? 0}
      initialData={initialData ?? undefined}
    />
  );
}
