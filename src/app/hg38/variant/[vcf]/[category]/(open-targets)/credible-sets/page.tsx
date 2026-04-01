import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchVariantGraph,
  getEdgeRows,
  ep,
  nb,
} from "@features/variant/api/variant-graph";
import { CredibleSetsTable } from "@features/variant/components/graph/credible-sets-table";
import type { CredibleSetRow } from "@features/variant/components/graph/credible-sets-table";
import { notFound } from "next/navigation";

interface CredibleSetsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function CredibleSetsPage({
  params,
}: CredibleSetsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const variantVcf = result.selected.variant_vcf;

  const graph = await fetchVariantGraph(variantVcf, [
    "VARIANT_ASSOCIATED_WITH_STUDY",
  ]);

  const edgeRows = getEdgeRows(graph, "VARIANT_ASSOCIATED_WITH_STUDY");

  const rows: CredibleSetRow[] = edgeRows.map((row, i) => ({
    id: nb<string>(row, "id") ?? `study-${i}`,
    studyId: nb<string>(row, "id") ?? "",
    studyTrait: (ep<string>(row, "study_trait") ?? ""),
    studyTitle: (ep<string>(row, "study_title") ?? ""),
    traitName: (ep<string>(row, "trait_name") ?? ""),
    pValueMlog: ep<number>(row, "p_value_mlog") ?? null,
    orBeta: ep<number>(row, "or_beta") ?? null,
    riskAllele: ep<string>(row, "risk_allele") ?? "",
    source: (nb<string>(row, "type") ?? "Study"),
  }));

  // Sort by pValueMlog descending (most significant first)
  rows.sort((a, b) => (b.pValueMlog ?? -Infinity) - (a.pValueMlog ?? -Infinity));

  return <CredibleSetsTable data={rows} />;
}
