import {
  type EdgeRow,
  ep,
  fetchVariantGraph,
  getEdgeRows,
  nb,
} from "@features/variant/api/variant-graph";
import {
  type PharmacogenomicsRow,
  PharmacogenomicsTable,
} from "@features/variant/components/graph/pharmacogenomics-table";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

// ============================================================================
// Edge types fetched from the FAVOR knowledge graph
// ============================================================================

const PHARMACOGENOMICS_EDGE_TYPES = [
  "VARIANT_ASSOCIATED_WITH_DRUG",
  "VARIANT_LINKED_TO_SIDE_EFFECT",
] as const;

// ============================================================================
// Transform graph edge rows into flat table rows
// ============================================================================

function transformDrugResponseRows(rows: EdgeRow[]): PharmacogenomicsRow[] {
  return rows.map((r, i) => ({
    id: `drug-response-${i}`,
    drugName:
      ep<string>(r, "drug_name") ??
      nb<string>(r, "label") ??
      nb<string>(r, "name") ??
      "Unknown",
    drugId: r.neighbor.id,
    type: "drug_response" as const,
    clinicalSignificance: ep<string>(r, "clinical_significance") ?? "",
    directionOfEffect: ep<string>(r, "direction_of_effect") ?? "",
    evidenceCount: ep<number>(r, "evidence_count") ?? null,
    geneSymbol: "",
    confidence: "",
    source: "PharmGKB",
  }));
}

function transformSideEffectRows(rows: EdgeRow[]): PharmacogenomicsRow[] {
  return rows.map((r, i) => ({
    id: `side-effect-${i}`,
    drugName: ep<string>(r, "drug_name") ?? "",
    drugId: r.neighbor.id,
    type: "side_effect" as const,
    clinicalSignificance: "",
    directionOfEffect: "",
    evidenceCount: null,
    geneSymbol: ep<string>(r, "gene_symbol") ?? "",
    confidence: ep<string>(r, "confidence_class") ?? "",
    source: "PharmGKB",
  }));
}

// ============================================================================
// Page
// ============================================================================

interface PharmacogenomicsPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function PharmacogenomicsPage({
  params,
}: PharmacogenomicsPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const resolvedVcf = result.selected.variant_vcf;
  const graphResponse = await fetchVariantGraph(
    resolvedVcf,
    [...PHARMACOGENOMICS_EDGE_TYPES],
    500,
  );

  const drugResponseRows = transformDrugResponseRows(
    getEdgeRows(graphResponse, "VARIANT_ASSOCIATED_WITH_DRUG"),
  );
  const sideEffectRows = transformSideEffectRows(
    getEdgeRows(graphResponse, "VARIANT_LINKED_TO_SIDE_EFFECT"),
  );

  const rows: PharmacogenomicsRow[] = [...drugResponseRows, ...sideEffectRows];

  return <PharmacogenomicsTable data={rows} />;
}
