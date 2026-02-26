import type { EdgeType } from "../types/edge";
import { getEdgeFieldsForTypes } from "../types/edge";
import type { GraphQueryStep, GraphQueryStepOrBranch } from "../api";

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

/** @deprecated Use TemplateId from explorer-config.ts instead */
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

/** @deprecated Use GENE_EXPLORER_CONFIG.defaultTemplateId instead */
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
 * Serialize a single QueryStep, stripping any undefined fields
 * to prevent serialization issues with the backend's untagged enum.
 */
function serializeQueryStep(s: QueryStep): GraphQueryStep {
  // Build the step object field-by-field, only including defined values.
  // The backend uses a serde untagged enum — unknown fields cause 422.
  const out: Record<string, unknown> = {
    edgeTypes: s.edgeTypes as string[],
    direction: s.direction,
  };
  if (s.limit !== undefined) out.limit = s.limit;
  if (s.sort !== undefined) out.sort = s.sort;
  if (s.filters !== undefined) out.filters = s.filters;
  if (s.overlayOnly !== undefined) out.overlayOnly = s.overlayOnly;
  return out as unknown as GraphQueryStep;
}

/**
 * Serialize lens steps to the API's step format.
 * Regular steps → { edgeTypes, direction, limit, sort, filters }
 * Branch steps  → { branch: [{ edgeTypes, direction, ... }, ...] }
 *
 * Strips undefined fields to ensure clean JSON for the backend's
 * StepOrBranch untagged enum deserializer.
 */
export function serializeLensSteps(steps: LensStep[]): GraphQueryStepOrBranch[] {
  return steps.map((step): GraphQueryStepOrBranch => {
    if (isBranchStep(step)) {
      return {
        branch: step.branch.map(serializeQueryStep),
      } as GraphQueryStepOrBranch;
    }
    return serializeQueryStep(step) as GraphQueryStepOrBranch;
  });
}

/** @deprecated Use GENE_EXPLORER_CONFIG.templates instead */
export const GRAPH_LENSES: GraphLens[] = [
  // =========================================================================
  // 1) Clinical Relevance — "Is this gene causal / clinically relevant?"
  //
  // All edges are Gene→Disease. Single branch from Gene seed captures every
  // evidence tier in one step.
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene frontier, all direction "out"):
  //     - GENE_ASSOCIATED_WITH_DISEASE: broad associations (ranked)
  //     - GENE_ALTERED_IN_DISEASE: somatic alterations
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
          { edgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE"], direction: "out", limit: 30 },
          { edgeTypes: ["GENE_ALTERED_IN_DISEASE"], direction: "out", limit: 20 },
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
  //     VARIANT_IMPLIES_GENE + VARIANT_AFFECTS_GENE. Gene is TARGET. Brings in Variants.
  //     Result set: {Gene, Variants}. Frontier → Variant.
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
          { edgeTypes: ["VARIANT_AFFECTS_GENE"], direction: "in", limit: 20 },
          { edgeTypes: ["VARIANT_IMPLIES_GENE"], direction: "in", limit: 20 },
        ],
      },
    ],
    limits: { maxNodes: 300, maxEdges: 1000 },
  },

  // =========================================================================
  // 3) Regulation & Tissue — "Regulatory elements and tissue control"
  //
  //   Seed: Gene
  //   Step 1 (from Gene, direction "in"):
  //     CCRE_REGULATES_GENE. Gene is TARGET. Brings in cCREs.
  //     Result set: {Gene, cCREs}. Frontier → cCRE.
  //   Step 2 (from cCRE frontier, direction "in"):
  //     VARIANT_OVERLAPS_CCRE. cCRE is TARGET. Brings in Variants.
  //     Result set: {Gene, cCREs, Variants}. Frontier → Variant.
  //   Step 3 overlayOnly (from Variant frontier, direction "out"):
  //     VARIANT_IMPLIES_GENE. Variant IS the source → direction "out" works.
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
        edgeTypes: ["CCRE_REGULATES_GENE"],
        direction: "in",
        limit: 20,
      },
      {
        edgeTypes: ["VARIANT_OVERLAPS_CCRE"],
        direction: "in",
        limit: 20,
      },
      {
        edgeTypes: ["VARIANT_IMPLIES_GENE"],
        direction: "out",
        limit: 30,
        overlayOnly: true,
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },

  // =========================================================================
  // 4) Therapeutics — "Is this gene targetable, and who's doing it?"
  //
  //   Seed: Gene
  //   Step 1 branch (from Gene frontier):
  //     - DRUG_ACTS_ON_GENE direction "in": Drug→Gene. Gene is TARGET. Brings in Drugs.
  //     - GENE_AFFECTS_DRUG_RESPONSE direction "out": Gene→Drug. Brings in Drugs.
  //     Result set: {Gene, Drugs}. Frontier → Drug.
  //   Step 2 overlayOnly (from Drug frontier, direction "out"):
  //     DRUG_ACTS_ON_GENE: Drug→Gene. Drug IS the source → "out" works.
  //     Gene in result set. Adds disease-context targeting edges.
  //   Step 3 branch (from Drug frontier — unchanged by overlay):
  //     - DRUG_INDICATED_FOR_DISEASE "out": Drug→Disease. Brings in Diseases.
  //     - VARIANT_ASSOCIATED_WITH_DRUG "in": Variant→Drug. Drug is TARGET. Brings in Variants.
  // =========================================================================
  {
    id: "therapeutics",
    name: "Therapeutics",
    description: "Drug targeting, disease indications, and pharmacogenomics",
    icon: "pill",
    color: "#22c55e",
    steps: [
      {
        branch: [
          { edgeTypes: ["DRUG_ACTS_ON_GENE"], direction: "in", limit: 15 },
          { edgeTypes: ["GENE_AFFECTS_DRUG_RESPONSE"], direction: "out", limit: 15 },
        ],
      },
      {
        edgeTypes: ["DRUG_ACTS_ON_GENE"],
        direction: "out",
        limit: 30,
        overlayOnly: true,
      },
      {
        branch: [
          { edgeTypes: ["DRUG_INDICATED_FOR_DISEASE"], direction: "out", limit: 12 },
          { edgeTypes: ["VARIANT_ASSOCIATED_WITH_DRUG"], direction: "in", limit: 12 },
        ],
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },

  // =========================================================================
  // 5) Phenotypes — "What traits show up when this gene is perturbed?"
  //
  //   Seed: Gene
  //   Step 1 (from Gene, direction "out"):
  //     GENE_ASSOCIATED_WITH_PHENOTYPE. Brings in Phenotypes.
  //     Result set: {Gene, Phenotypes}. Frontier → Phenotype.
  //   Step 2 overlayOnly (from Phenotype frontier, direction "out"):
  //     PHENOTYPE_HIERARCHY: Phenotype→Phenotype (child→parent).
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
        edgeTypes: ["GENE_ASSOCIATED_WITH_PHENOTYPE"],
        direction: "out",
        limit: 30,
      },
      {
        edgeTypes: ["PHENOTYPE_HIERARCHY"],
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
  //   Step 1 (from Gene, direction "out"):
  //     GENE_ASSOCIATED_WITH_ENTITY. Discovers Entities.
  //     Frontier → Entity.
  //   Step 2 branch (from Entity frontier):
  //     VARIANT_ASSOCIATED_WITH_TRAIT__Entity "in": Variant→Entity. Entity is TARGET. Discovers Variants.
  //     VARIANT_ASSOCIATED_WITH_STUDY "out" from Variant: links variants to studies.
  //     Frontier → Entity + Variant + Study.
  //   Step 3 overlayOnly (from full frontier, direction "out"):
  //     STUDY_INVESTIGATES_TRAIT__Entity — connects studies to entities already in set. ✓
  // =========================================================================
  {
    id: "gwas",
    name: "Complex Genetics",
    description: "Trait associations, GWAS variants, and study evidence",
    icon: "bar-chart",
    color: "#3b82f6",
    steps: [
      {
        edgeTypes: ["GENE_ASSOCIATED_WITH_ENTITY"],
        direction: "out",
        limit: 15,
      },
      {
        branch: [
          { edgeTypes: ["VARIANT_ASSOCIATED_WITH_TRAIT__Entity"], direction: "in", limit: 12 },
          { edgeTypes: ["VARIANT_ASSOCIATED_WITH_STUDY"], direction: "out", limit: 10 },
        ],
      },
      {
        edgeTypes: ["STUDY_INVESTIGATES_TRAIT__Entity"],
        direction: "out",
        limit: 15,
        overlayOnly: true,
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },
];
