import type { EdgeType } from "../types/edge";
import type { EdgeTypeStatsMap } from "../utils/schema-fields";

/**
 * A field to display in the edge tooltip.
 */
export interface TooltipField {
  key: string;
  label: string;
  format?: "number" | "score" | "text" | "phase";
}

/**
 * Schema-aware field picking for edge tooltips.
 * Shows the 2-3 most informative fields per edge type.
 * Database provenance ("Source") is auto-appended by edge-tooltip.tsx — don't include here.
 */
export const EDGE_TOOLTIP_FIELDS: Partial<Record<EdgeType, TooltipField[]>> = {
  // Gene → Disease
  GENE_ASSOCIATED_WITH_DISEASE: [
    { key: "overall_score", label: "Score", format: "score" },
    { key: "evidence_count", label: "Evidence", format: "number" },
  ],
  GENE_ALTERED_IN_DISEASE: [
    { key: "alteration_type", label: "Alteration" },
    { key: "frequency", label: "Frequency", format: "score" },
  ],

  // Gene → Drug
  GENE_AFFECTS_DRUG_RESPONSE: [
    { key: "clinical_significance", label: "Significance" },
    { key: "evidence_level", label: "Evidence Level" },
  ],

  // Gene → Entity
  GENE_ASSOCIATED_WITH_ENTITY: [
    { key: "best_p_value_mlog", label: "-log10(p)", format: "score" },
    { key: "n_studies", label: "Studies", format: "number" },
    { key: "n_variants", label: "Variants", format: "number" },
  ],

  // Gene → Gene
  GENE_INTERACTS_WITH_GENE: [
    { key: "combined_score", label: "Score", format: "score" },
    { key: "num_sources", label: "Sources", format: "number" },
  ],

  // Gene → Phenotype
  GENE_ASSOCIATED_WITH_PHENOTYPE: [
    { key: "evidence_code", label: "Evidence" },
  ],

  // Gene → GOTerm
  GENE_ANNOTATED_WITH_GO_TERM: [
    { key: "evidence_code", label: "Evidence" },
  ],

  // Drug → Gene
  DRUG_ACTS_ON_GENE: [
    { key: "action_type", label: "Action" },
    { key: "mechanism_of_action", label: "Mechanism" },
    { key: "max_clinical_phase", label: "Phase", format: "phase" },
  ],

  // Drug → Disease
  DRUG_INDICATED_FOR_DISEASE: [
    { key: "max_clinical_phase", label: "Phase", format: "phase" },
  ],

  // Drug → SideEffect
  DRUG_HAS_ADVERSE_EFFECT: [
    { key: "frequency_description", label: "Frequency" },
    { key: "report_count", label: "Reports", format: "number" },
  ],

  // Variant → Gene
  VARIANT_IMPLIES_GENE: [
    { key: "max_l2g_score", label: "L2G Score", format: "score" },
    { key: "n_loci", label: "Loci", format: "number" },
  ],
  VARIANT_AFFECTS_GENE: [
    { key: "clinical_significance", label: "Significance" },
    { key: "max_pathogenicity", label: "Pathogenicity", format: "score" },
  ],

  // Variant → Entity/Disease/Phenotype
  VARIANT_ASSOCIATED_WITH_TRAIT__Entity: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
    { key: "or_beta", label: "Beta", format: "score" },
  ],
  VARIANT_ASSOCIATED_WITH_TRAIT__Phenotype: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
    { key: "or_beta", label: "Beta", format: "score" },
  ],
  VARIANT_ASSOCIATED_WITH_TRAIT__Disease: [
    { key: "clinical_significance", label: "Significance" },
    { key: "review_status", label: "Review" },
  ],

  // Variant → Drug
  VARIANT_ASSOCIATED_WITH_DRUG: [
    { key: "significance", label: "Significance" },
    { key: "direction_of_effect", label: "Effect Direction" },
  ],

  // Variant → Study
  VARIANT_ASSOCIATED_WITH_STUDY: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
    { key: "or_beta", label: "Beta", format: "score" },
  ],

  // Variant → cCRE
  VARIANT_OVERLAPS_CCRE: [
    { key: "annotation_label", label: "Annotation" },
    { key: "distance_to_center", label: "Distance", format: "number" },
  ],

  // cCRE → Gene
  CCRE_REGULATES_GENE: [
    { key: "max_score", label: "Score", format: "score" },
    { key: "n_tissues", label: "Tissues", format: "number" },
  ],

  // Disease hierarchy
  DISEASE_SUBCLASS_OF_DISEASE: [
    { key: "distance", label: "Distance", format: "number" },
  ],
  DISEASE_ANCESTOR_OF_DISEASE: [
    { key: "distance", label: "Distance", format: "number" },
  ],

  // Phenotype hierarchy
  PHENOTYPE_HIERARCHY: [
    { key: "distance", label: "Distance", format: "number" },
  ],

  // Signal
  SIGNAL_ASSOCIATED_WITH_TRAIT__Entity: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
  ],
  SIGNAL_HAS_VARIANT: [
    { key: "posterior_probability", label: "PIP", format: "score" },
  ],
  SIGNAL_IMPLIES_GENE: [
    { key: "l2g_score", label: "L2G Score", format: "score" },
  ],
};

/**
 * Get tooltip fields for an edge type with schema fallback.
 * Uses hardcoded fields if available, otherwise falls back to schema scoreFields[0..2].
 */
export function getTooltipFields(
  edgeType: EdgeType,
  schemaMap?: EdgeTypeStatsMap,
): TooltipField[] {
  // Prefer hardcoded tooltip fields (curated with labels and formats)
  const hardcoded = EDGE_TOOLTIP_FIELDS[edgeType];
  if (hardcoded && hardcoded.length > 0) return hardcoded;

  // Fall back to schema scoreFields (first 2-3 fields)
  if (schemaMap) {
    const stats = schemaMap.get(edgeType);
    if (stats?.scoreFields && stats.scoreFields.length > 0) {
      return stats.scoreFields.slice(0, 3).map((field) => ({
        key: field,
        label: field
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        format: "score" as const,
      }));
    }
  }

  return [];
}

/**
 * Format a field value for tooltip display.
 */
export function formatTooltipValue(value: unknown, format?: TooltipField["format"]): string {
  if (value === null || value === undefined) return "\u2014";

  switch (format) {
    case "score":
      return typeof value === "number" ? value.toFixed(3) : String(value);
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "phase":
      return typeof value === "number" ? `Phase ${value}` : String(value);
    default:
      return String(value);
  }
}
