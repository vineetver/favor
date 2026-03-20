import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { loadCcreGeneLinksData } from "@features/enrichment/loaders";
import { VariantCcreLinksView } from "@features/enrichment/components/variant-ccre-links-view";
import { notFound } from "next/navigation";

export default async function VariantCcreLinksPage({
  params,
  searchParams,
}: {
  params: Promise<{ vcf: string }>;
  searchParams: Promise<{ tissue_group?: string }>;
}) {
  const { vcf } = await params;
  const { tissue_group: tissueGroup } = await searchParams;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const accession = result.selected.ccre?.accessions;
  if (!accession) {
    return <VariantCcreLinksView ccreId="—" totalCount={0} groupedData={[]} />;
  }

  const ccreId = accession.split(",")[0].trim();
  const data = await loadCcreGeneLinksData(ccreId, tissueGroup);

  return <VariantCcreLinksView ccreId={ccreId} {...data} />;
}
