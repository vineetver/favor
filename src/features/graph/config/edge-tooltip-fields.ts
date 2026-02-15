import type { EdgeType } from "../types/edge";

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
  ASSOCIATED_WITH_DISEASE: [
    { key: "overall_score", label: "Score", format: "score" },
    { key: "evidence_count", label: "Evidence", format: "number" },
  ],
  CURATED_FOR: [
    { key: "classification", label: "Classification" },
    { key: "confidence_category", label: "Confidence" },
  ],
  CAUSES: [
    { key: "classification", label: "Classification" },
  ],
  INHERITED_CAUSE_OF: [
    { key: "classification", label: "Classification" },
    { key: "expert_panel", label: "Panel" },
  ],
  CIVIC_EVIDENCED_FOR: [
    { key: "evidence_level", label: "Level" },
    { key: "significance", label: "Significance" },
  ],
  SCORED_FOR_DISEASE: [
    { key: "overall_score", label: "Score", format: "score" },
    { key: "num_datatypes", label: "Datatypes", format: "number" },
  ],

  // Drug edges
  TARGETS: [
    { key: "action_type", label: "Action" },
    { key: "mechanism_of_action", label: "Mechanism" },
    { key: "max_clinical_phase", label: "Phase", format: "phase" },
  ],
  TARGETS_IN_CONTEXT: [
    { key: "action_type", label: "Action" },
    { key: "max_clinical_phase", label: "Phase", format: "phase" },
  ],
  INDICATED_FOR: [
    { key: "max_clinical_phase", label: "Phase", format: "phase" },
  ],
  HAS_SIDE_EFFECT: [
    { key: "frequency_description", label: "Frequency" },
    { key: "report_count", label: "Reports", format: "number" },
  ],
  HAS_ADVERSE_REACTION: [
    { key: "llr", label: "LLR", format: "score" },
    { key: "report_count", label: "Reports", format: "number" },
  ],

  // Variant edges
  PREDICTED_TO_AFFECT: [
    { key: "max_l2g_score", label: "L2G Score", format: "score" },
    { key: "n_loci", label: "Loci", format: "number" },
  ],
  GWAS_ASSOCIATED_WITH: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
    { key: "beta", label: "Beta", format: "score" },
  ],
  CLINVAR_ASSOCIATED: [
    { key: "clinical_significance", label: "Significance" },
    { key: "review_status", label: "Review" },
  ],

  // Variant → Drug
  AFFECTS_RESPONSE_TO: [
    { key: "significance", label: "Significance" },
    { key: "direction_of_effect", label: "Effect Direction" },
  ],

  // Variant → Gene
  CLINVAR_ANNOTATED_IN: [
    { key: "clinical_significance", label: "Significance" },
    { key: "review_status", label: "Review" },
  ],

  // Gene → Trait
  SCORED_FOR_TRAIT: [
    { key: "total_score", label: "Total Score", format: "score" },
    { key: "ld_score", label: "LD Score", format: "score" },
  ],

  // Gene → Variant
  HAS_GWAS_VARIANT: [
    { key: "p_value_mlog", label: "-log10(p)", format: "score" },
  ],

  // Gene → Gene
  REGULATES: [
    { key: "interaction_type_name", label: "Type" },
  ],

  // Variant → Disease
  PGX_DISEASE_ASSOCIATED: [
    { key: "significance", label: "Significance" },
    { key: "direction_of_effect", label: "Effect Direction" },
    { key: "n_studies", label: "Studies", format: "number" },
  ],

  // Variant → Gene
  PREDICTED_REGULATORY_TARGET: [
    { key: "score", label: "Score", format: "score" },
    { key: "confidence", label: "Confidence" },
  ],
  ENHANCER_LINKED_TO: [
    { key: "feature_score", label: "Feature Score", format: "score" },
    { key: "target_score", label: "Target Score", format: "score" },
  ],
  POSITIONALLY_LINKED_TO: [
    { key: "consequence", label: "Consequence" },
    { key: "region_type", label: "Region" },
  ],
  MISSENSE_PATHOGENIC_FOR: [
    { key: "max_pathogenicity", label: "Pathogenicity", format: "score" },
    { key: "pathogenicity_class", label: "Class" },
  ],

  // Gene → Gene
  INTERACTS_WITH: [
    { key: "combined_score", label: "Score", format: "score" },
  ],
  INTERACTS_IN_PATHWAY: [
    { key: "combined_score", label: "Score", format: "score" },
  ],

  // GO/Ontology
  ANNOTATED_WITH: [
    { key: "evidence_code", label: "Evidence" },
  ],
  SUBCLASS_OF: [
    { key: "distance", label: "Distance", format: "number" },
  ],
  ANCESTOR_OF: [
    { key: "distance", label: "Distance", format: "number" },
  ],
};

/**
 * Format a field value for tooltip display.
 */
export function formatTooltipValue(value: unknown, format?: TooltipField["format"]): string {
  if (value === null || value === undefined) return "—";

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
