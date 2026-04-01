import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import {
  fetchVariantGraph,
  getEdgeRows,
  ep,
  nb,
  type EdgeRow,
} from "@features/variant/api/variant-graph";
import { EvidencesTable } from "@features/variant/components/graph/evidences-table";
import { notFound } from "next/navigation";
import type { DiseaseEvidenceRow } from "@features/variant/components/graph/evidences-table";

// ============================================================================
// Edge types fetched from the FAVOR knowledge graph
// ============================================================================

const EVIDENCE_EDGE_TYPES = [
  "VARIANT_ASSOCIATED_WITH_TRAIT__Disease",
  "VARIANT_ASSOCIATED_WITH_TRAIT__Entity",
  "VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype",
] as const;

// ============================================================================
// Transform graph edge rows into flat table rows
// ============================================================================

function traitTypeFromEdge(edgeType: string): string {
  if (edgeType.endsWith("__Disease")) return "Disease";
  if (edgeType.endsWith("__Entity")) return "Entity";
  if (edgeType.endsWith("__Phenotype")) return "Phenotype";
  return "Unknown";
}

function transformEdgeRows(
  rows: EdgeRow[],
  edgeType: string,
): DiseaseEvidenceRow[] {
  const traitType = traitTypeFromEdge(edgeType);

  return rows.map((r, i) => ({
    id: `${traitType.toLowerCase()}-${i}`,
    traitName:
      String(ep(r, "trait_name") ?? nb(r, "label") ?? nb(r, "name") ?? ""),
    traitType,
    traitId: r.neighbor.id,
    clinicalSignificance: String(ep(r, "clinical_significance") ?? ""),
    pValueMlog:
      ep(r, "p_value_mlog") != null ? Number(ep(r, "p_value_mlog")) : null,
    orBeta: ep(r, "or_beta") != null ? Number(ep(r, "or_beta")) : null,
    riskAllele: String(ep(r, "risk_allele") ?? ""),
    confidence: String(ep(r, "confidence_class") ?? ""),
    source: String(ep(r, "source") ?? ""),
  }));
}

// ============================================================================
// Page
// ============================================================================

interface EvidencesPageProps {
  params: Promise<{
    vcf: string;
    category: string;
  }>;
}

export default async function EvidencesPage({ params }: EvidencesPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const resolvedVcf = result.selected.variant_vcf;
  const graphResponse = await fetchVariantGraph(
    resolvedVcf,
    [...EVIDENCE_EDGE_TYPES],
    500,
  );

  const rows: DiseaseEvidenceRow[] = EVIDENCE_EDGE_TYPES.flatMap((edgeType) =>
    transformEdgeRows(getEdgeRows(graphResponse, edgeType), edgeType),
  ).sort((a, b) => (b.pValueMlog ?? -Infinity) - (a.pValueMlog ?? -Infinity));

  return <EvidencesTable data={rows} />;
}
