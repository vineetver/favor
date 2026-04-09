import { API_BASE } from "@/config/api";
import {
  type EdgeRow,
  ep,
  fetchVariantGraph,
  getEdgeRows,
  nb,
} from "./variant-graph";

export interface TraitPoint {
  id: string;
  traitName: string;
  category: string;
  /** Numeric value plotted on the y-axis. For GWAS Catalog this is
   *  -log₁₀(p); for credible sets it's the posterior inclusion probability. */
  yValue: number | null;
  orBeta: number | null;
  riskAlleleFreq: number | null;
  mappedGene: string | null;
  /** Number of variants in the source credible set. Only populated by the
   *  credible-sets fetcher. */
  variantCount?: number | null;
  /** Fine-mapping method (e.g. "SuSiE", "PICS"). Only set by credible sets. */
  method?: string | null;
  /** Study accession or signal id (e.g. "GCST001392" or "OT_abc123"). */
  studyId?: string | null;
}

const EDGE_TYPES = [
  "VARIANT_ASSOCIATED_WITH_TRAIT__Entity",
  "VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype",
  "VARIANT_ASSOCIATED_WITH_TRAIT__Disease",
] as const;

type Origin = "Entity" | "Phenotype" | "Disease";

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s.length > 0 ? s : null;
}

/**
 * Batch-fetch disease → category mapping. Uses primary_anatomical_systems
 * (fill ~45%) plus the is_cancer flag (fill 100%). Missing entries fall
 * back to the "disease" bucket. No hardcoded name matching.
 */
async function fetchDiseaseCategories(
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;

  try {
    const res = await fetch(`${API_BASE}/graph/entities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "Disease",
        filters: { id__in: ids },
        fields: ["id", "primary_anatomical_systems", "is_cancer"],
        mode: "full",
        limit: ids.length,
      }),
    });
    if (!res.ok) return out;

    const json = (await res.json()) as {
      data?: {
        items?: Array<{
          entity: { id: string };
          fields?: {
            primary_anatomical_systems?: string[];
            is_cancer?: boolean;
          };
        }>;
      };
    };

    for (const item of json.data?.items ?? []) {
      const f = item.fields;
      if (f?.is_cancer) {
        out.set(item.entity.id, "oncology");
      } else if (f?.primary_anatomical_systems?.[0]) {
        out.set(item.entity.id, f.primary_anatomical_systems[0]);
      }
    }
  } catch {
    // Missing entries fall back to "disease" bucket in transformRow.
  }

  return out;
}

function transformRow(
  row: EdgeRow,
  origin: Origin,
  index: number,
  diseaseCategories: Map<string, string>,
): TraitPoint {
  const traitId = row.neighbor.id;
  const category =
    origin === "Entity"
      ? (nb<string>(row, "semantic_class") || "other")
      : origin === "Disease"
        ? (diseaseCategories.get(traitId) ?? "disease")
        : "phenotype";

  return {
    id: `${origin}-${traitId}-${index}`,
    traitName:
      strOrNull(ep(row, "trait_name")) ??
      strOrNull(nb(row, "name")) ??
      traitId,
    category,
    yValue: numOrNull(ep(row, "p_value_mlog")),
    orBeta: numOrNull(ep(row, "or_beta")),
    riskAlleleFreq: numOrNull(ep(row, "risk_allele_freq")),
    mappedGene: strOrNull(ep(row, "gene_symbol")),
  };
}

export async function fetchVariantTraitAssociations(
  vcf: string,
  limitPerEdgeType = 300,
): Promise<TraitPoint[]> {
  if (!vcf) return [];

  const response = await fetchVariantGraph(
    vcf,
    [...EDGE_TYPES],
    limitPerEdgeType,
  );
  if (!response) return [];

  const entityRows = getEdgeRows(response, "VARIANT_ASSOCIATED_WITH_TRAIT__Entity");
  const phenoRows = getEdgeRows(response, "VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype");
  const diseaseRows = getEdgeRows(response, "VARIANT_ASSOCIATED_WITH_TRAIT__Disease");

  const diseaseCategories = await fetchDiseaseCategories(
    Array.from(new Set(diseaseRows.map((r) => r.neighbor.id))),
  );

  return [
    ...entityRows.map((r, i) => transformRow(r, "Entity", i, diseaseCategories)),
    ...phenoRows.map((r, i) => transformRow(r, "Phenotype", i, diseaseCategories)),
    ...diseaseRows.map((r, i) => transformRow(r, "Disease", i, diseaseCategories)),
  ];
}
