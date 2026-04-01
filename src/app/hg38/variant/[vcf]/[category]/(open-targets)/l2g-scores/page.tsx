import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchVariantGraph,
  getEdgeRows,
  ep,
  nb,
} from "@features/variant/api/variant-graph";
import { L2GTable, type L2GRow } from "@features/variant/components/graph/l2g-table";
import { notFound } from "next/navigation";

interface L2GScoresPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function L2GScoresPage({ params }: L2GScoresPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const resolvedVcf = result.selected.variant_vcf;

  const graphResponse = await fetchVariantGraph(resolvedVcf, [
    "VARIANT_IMPLIES_GENE",
  ]);

  const edgeRows = getEdgeRows(graphResponse, "VARIANT_IMPLIES_GENE");

  const rows: L2GRow[] = edgeRows.map((row, i) => {
    const geneId = row.neighbor.id;
    const geneSymbol =
      nb<string>(row, "symbol") ??
      nb<string>(row, "label") ??
      nb<string>(row, "name") ??
      geneId;

    return {
      id: `${geneId}-${i}`,
      geneId,
      geneSymbol,
      l2gScore: ep<number>(row, "l2g_score") ?? null,
      confidenceClass: ep<string>(row, "confidence_class") ?? "Unknown",
      implicationMode: ep<string>(row, "implication_mode") ?? "Unknown",
      nLoci: ep<number>(row, "n_loci") ?? null,
      source: ep<string>(row, "implication_mode")?.includes("clinvar")
        ? "ClinVar"
        : ep<string>(row, "implication_mode")?.includes("opentargets")
          ? "Open Targets"
          : "FAVOR",
    };
  });

  return <L2GTable data={rows} />;
}
