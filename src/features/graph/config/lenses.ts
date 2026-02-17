import type { EdgeType } from "../types/edge";
import { getEdgeFieldsForTypes } from "../types/edge";
import type { GraphQueryStepOrBranch } from "../api";

// =============================================================================
// Lens System - Curated Views via /graph/query
// =============================================================================

export interface QueryStep {
  edgeTypes: EdgeType[];
  direction: "in" | "out" | "both";
  limit?: number;
  sort?: string;
  filters?: Record<string, unknown>;
  /** When true, only keep edges to nodes already in the result set. No new nodes, frontier unchanged. */
  overlayOnly?: boolean;
}

/** A branch fans the current frontier into parallel sub-expansions. */
export interface BranchStep {
  branch: QueryStep[];
}

export type LensStep = QueryStep | BranchStep;

export function isBranchStep(step: LensStep): step is BranchStep {
  return "branch" in step;
}

export type LensId = "clinical" | "variant" | "regulatory" | "therapeutics" | "phenotype" | "gwas";

export interface GraphLens {
  id: LensId;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: LensStep[];
  limits: { maxNodes: number; maxEdges: number };
  edgeFields?: string[];
}

export const DEFAULT_LENS: LensId = "clinical";

/**
 * Compute all schema fields for a lens by unioning the fields of all its edge types.
 */
export function getLensEdgeFields(lens: GraphLens): string[] {
  const allEdgeTypes: EdgeType[] = [];
  for (const step of lens.steps) {
    if (isBranchStep(step)) {
      for (const sub of step.branch) {
        allEdgeTypes.push(...sub.edgeTypes);
      }
    } else {
      allEdgeTypes.push(...step.edgeTypes);
    }
  }
  const fields = getEdgeFieldsForTypes(allEdgeTypes);
  if (!fields.includes("source")) fields.push("source");
  return fields.slice(0, 20);
}

/**
 * Serialize lens steps to the API's step format.
 * Regular steps → { edgeTypes, direction, limit, sort, filters }
 * Branch steps  → { branch: [{ edgeTypes, direction, ... }, ...] }
 */
export function serializeLensSteps(steps: LensStep[]): GraphQueryStepOrBranch[] {
  return steps.map((step): GraphQueryStepOrBranch => {
    if (isBranchStep(step)) {
      return {
        branch: step.branch.map((s) => ({
          edgeTypes: s.edgeTypes as string[],
          direction: s.direction,
          limit: s.limit,
          sort: s.sort,
          filters: s.filters,
          overlayOnly: s.overlayOnly,
        })),
      };
    }
    return {
      edgeTypes: step.edgeTypes as string[],
      direction: step.direction,
      limit: step.limit,
      sort: step.sort,
      filters: step.filters,
      overlayOnly: step.overlayOnly,
    };
  });
}

export const GRAPH_LENSES: GraphLens[] = [
  // =========================================================================
  // 1) Clinical Relevance — "Is this gene causal / clinically relevant?"
  //
  // All edges are Gene→Disease. Single branch from Gene seed captures every
  // evidence tier in one step. No overlayOnly needed — avoids the problem
  // where overlayOnly expands from frontier (Disease) but edges come FROM Gene.
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene frontier, all direction "out"):
  //     - ASSOCIATED_WITH_DISEASE: broad OpenTargets associations (ranked)
  //     - CURATED_FOR + CAUSES + INHERITED_CAUSE_OF: curated causal (ClinGen/DDG2P/Orphanet)
  //     - CIVIC_EVIDENCED_FOR: cancer clinical evidence
  //     - THERAPEUTIC_TARGET_IN + BIOMARKER_FOR: TTD target/biomarker
  //   Diseases deduplicated; multi-edge types between Gene↔Disease preserved.
  // =========================================================================
  {
    id: "clinical",
    name: "Clinical Relevance",
    description: "Disease causality — curated, cancer, and association evidence",
    icon: "heart-pulse",
    color: "#ef4444",
    steps: [
      {
        branch: [
          { edgeTypes: ["ASSOCIATED_WITH_DISEASE"], direction: "out", limit: 15, sort: "-overall_score" },
          { edgeTypes: ["CURATED_FOR", "CAUSES", "INHERITED_CAUSE_OF"], direction: "out", limit: 30 },
          { edgeTypes: ["CIVIC_EVIDENCED_FOR"], direction: "out", limit: 15 },
          { edgeTypes: ["THERAPEUTIC_TARGET_IN", "BIOMARKER_FOR"], direction: "out", limit: 20 },
        ],
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },

  // =========================================================================
  // 2) Variant Landscape — "Show me the variants that make this gene real"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene frontier, all direction "in"):
  //     All 5 Variant→Gene edge types. Gene is TARGET. Brings in Variants.
  //     Result set: {Gene, Variants}. Frontier → Variant.
  //   Step 2 overlayOnly (from Variant frontier, direction "out"):
  //     POSITIONALLY_LINKED_TO: Variant→Gene. Variant IS the frontier/source → works.
  //     Adds consequence/HGVSc/HGVSp edges onto existing variant-gene pairs.
  // =========================================================================
  {
    id: "variant",
    name: "Variant Landscape",
    description: "ClinVar, coding impact, and regulatory variants implicating this gene",
    icon: "dna",
    color: "#f59e0b",
    steps: [
      {
        branch: [
          { edgeTypes: ["CLINVAR_ANNOTATED_IN"], direction: "in", limit: 15 },
          { edgeTypes: ["MISSENSE_PATHOGENIC_FOR"], direction: "in", limit: 12, sort: "-max_pathogenicity" },
          { edgeTypes: ["PREDICTED_TO_AFFECT"], direction: "in", limit: 10, sort: "-max_l2g_score" },
          { edgeTypes: ["PREDICTED_REGULATORY_TARGET"], direction: "in", limit: 8, sort: "-score" },
          { edgeTypes: ["ENHANCER_LINKED_TO"], direction: "in", limit: 8, sort: "-feature_score" },
        ],
      },
    ],
    limits: { maxNodes: 300, maxEdges: 1000 },
  },

  // =========================================================================
  // 3) Regulation & Tissue — "Regulatory elements and tissue control"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene, direction "in"):
  //     cCRE→Gene regulation edges. Gene is TARGET. Brings in cCREs.
  //     Result set: {Gene, cCREs}. Frontier → cCRE.
  //   Step 2 (from cCRE frontier, direction "in"):
  //     Variant→cCRE OVERLAPS. cCRE is TARGET. Brings in Variants.
  //     Result set: {Gene, cCREs, Variants}. Frontier → Variant.
  //   Step 3 overlayOnly (from Variant frontier, direction "out"):
  //     Variant→Gene edges. Variant IS the source → direction "out" works.
  //     Gene in result set. Completes Variant → cCRE → Gene regulatory chains.
  // =========================================================================
  {
    id: "regulatory",
    name: "Regulation & Tissue",
    description: "cCREs, regulatory circuits, and variant overlap by tissue",
    icon: "microscope",
    color: "#8b5cf6",
    steps: [
      {
        branch: [
          { edgeTypes: ["EXPERIMENTALLY_REGULATES"], direction: "in", limit: 15, sort: "-max_score" },
          { edgeTypes: ["COMPUTATIONALLY_REGULATES"], direction: "in", limit: 10, sort: "-max_score" },
        ],
      },
      {
        edgeTypes: ["OVERLAPS"],
        direction: "in",
        limit: 20,
      },
      {
        // Frontier: Variant. Variant→Gene edges. Variant IS the source → "out" works.
        branch: [
          { edgeTypes: ["PREDICTED_TO_AFFECT"], direction: "out", limit: 30, overlayOnly: true },
          { edgeTypes: ["ENHANCER_LINKED_TO"], direction: "out", limit: 20, overlayOnly: true },
        ],
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },

  // =========================================================================
  // 4) Therapeutics — "Is this gene targetable, and who's doing it?"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene frontier):
  //     - TARGETS direction "in": Drug→Gene. Gene is TARGET. Brings in Drugs.
  //     - HAS_PGX_INTERACTION + HAS_CLINICAL_DRUG_EVIDENCE direction "out":
  //       Gene→Drug. Gene is SOURCE. Also brings in Drugs.
  //     Result set: {Gene, Drugs}. Frontier → Drug.
  //   Step 2 overlayOnly (from Drug frontier, direction "out"):
  //     TARGETS_IN_CONTEXT: Drug→Gene. Drug IS the source → "out" works.
  //     Gene in result set. Adds disease-context targeting edges.
  //   Step 3 branch (from Drug frontier — unchanged by overlay):
  //     - INDICATED_FOR "out": Drug→Disease. Brings in Diseases.
  //     - AFFECTS_RESPONSE_TO "in": Variant→Drug. Drug is TARGET. Brings in Variants.
  //     - PGX_CLINICAL_RESPONSE "in": same pattern.
  // =========================================================================
  {
    id: "therapeutics",
    name: "Therapeutics",
    description: "Drug targeting, disease indications, and pharmacogenomics",
    icon: "pill",
    color: "#22c55e",
    steps: [
      {
        // Both Drug→Gene ("in") and Gene→Drug ("out") from Gene frontier.
        branch: [
          { edgeTypes: ["TARGETS"], direction: "in", limit: 15 },
          { edgeTypes: ["HAS_PGX_INTERACTION", "HAS_CLINICAL_DRUG_EVIDENCE"], direction: "out", limit: 15 },
        ],
      },
      {
        // Frontier: Drug. TARGETS_IN_CONTEXT: Drug→Gene. Drug IS the source → "out" works.
        edgeTypes: ["TARGETS_IN_CONTEXT"],
        direction: "out",
        limit: 30,
        overlayOnly: true,
      },
      {
        // Frontier: Drug (unchanged by overlay).
        branch: [
          { edgeTypes: ["INDICATED_FOR"], direction: "out", limit: 12 },
          { edgeTypes: ["AFFECTS_RESPONSE_TO"], direction: "in", limit: 8 },
          { edgeTypes: ["PGX_CLINICAL_RESPONSE"], direction: "in", limit: 8 },
        ],
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },

  // =========================================================================
  // 5) Phenotypes — "What traits show up when this gene is perturbed?"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene, direction "out"):
  //     Gene→Phenotype edges. Brings in Phenotypes.
  //     Result set: {Gene, Phenotypes}. Frontier → Phenotype.
  //   Step 2 overlayOnly (from Phenotype frontier, direction "out"):
  //     PHENOTYPE_SUBCLASS_OF: Phenotype→Phenotype (child→parent).
  //     Phenotype IS the source → "out" works. Both endpoints Phenotype. ✓
  // =========================================================================
  {
    id: "phenotype",
    name: "Phenotypes",
    description: "Human and mouse phenotypes from gene perturbation",
    icon: "activity",
    color: "#ec4899",
    steps: [
      {
        branch: [
          { edgeTypes: ["MANIFESTS_AS"], direction: "out", limit: 20 },
          { edgeTypes: ["MOUSE_MANIFESTS_AS"], direction: "out", limit: 15 },
        ],
      },
      {
        edgeTypes: ["PHENOTYPE_SUBCLASS_OF"],
        direction: "out",
        limit: 15,
        overlayOnly: true,
      },
    ],
    limits: { maxNodes: 200, maxEdges: 600 },
  },

  // =========================================================================
  // 6) Complex Genetics — "Combined trait-first + GWAS variant discovery"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene, direction "out"):
  //     Gene→Trait  SCORED_FOR_TRAIT (AbbVie scored traits).
  //     Gene→Variant HAS_GWAS_VARIANT (GWAS Catalog variants).
  //     Frontier → Trait + Variant.
  //   Step 2 branch (from Trait+Variant frontier, direction "out"):
  //     Variant→Trait GWAS_ASSOCIATED_WITH — links variants to their traits.
  //     Variant→Study REPORTED_IN — links variants to their publications.
  //     Frontier → Trait + Variant + Study.
  //   Step 3 overlayOnly (from full frontier, direction "out"):
  //     Study→Trait INVESTIGATES — connects studies to traits already in set. ✓
  // =========================================================================
  {
    id: "gwas",
    name: "Complex Genetics",
    description: "Trait associations, GWAS variants, and study evidence",
    icon: "bar-chart",
    color: "#3b82f6",
    steps: [
      {
        branch: [
          { edgeTypes: ["SCORED_FOR_TRAIT"], direction: "out", limit: 15 },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 12, sort: "-p_value_mlog" },
        ],
      },
      {
        branch: [
          { edgeTypes: ["GWAS_ASSOCIATED_WITH"], direction: "out", limit: 12, sort: "-p_value_mlog" },
          { edgeTypes: ["REPORTED_IN"], direction: "out", limit: 10, sort: "-p_value_mlog" },
        ],
      },
      {
        edgeTypes: ["INVESTIGATES"],
        direction: "out",
        limit: 15,
        overlayOnly: true,
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },
];
