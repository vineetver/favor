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

export type LensId = "clinical" | "regulatory" | "pharmacology" | "network" | "phenotype" | "functional";

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
  {
    id: "clinical",
    name: "Clinical",
    description: "Diseases, clinical variants, and available treatments",
    icon: "heart-pulse",
    color: "#ef4444",
    // Step 1: strongest disease associations by OpenTargets overall score
    // Step 2: overlay curated evidence (ClinGen, DDG2P, Orphanet, CIViC) onto those diseases
    // Step 3: drugs indicated for those diseases
    steps: [
      {
        edgeTypes: ["ASSOCIATED_WITH_DISEASE"],
        direction: "out",
        limit: 12,
        sort: "-overall_score",
        filters: { overall_score__gte: 0.3 },
      },
      {
        edgeTypes: ["CURATED_FOR", "CAUSES", "INHERITED_CAUSE_OF", "CIVIC_EVIDENCED_FOR"],
        direction: "in",
        limit: 50,
        overlayOnly: true,
      },
      {
        edgeTypes: ["INDICATED_FOR"],
        direction: "in",
        limit: 10,
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },
  {
    id: "regulatory",
    name: "Regulatory",
    description: "Variants affecting this gene and the traits they influence",
    icon: "dna",
    color: "#8b5cf6",
    // Step 1: branch — variants predicted to affect this gene (L2G) + gene's GWAS variants
    // Step 2: branch — cCREs overlapping those variants + GWAS trait associations
    // Step 3: overlay regulatory links from cCREs back to genes already in the graph
    steps: [
      {
        branch: [
          { edgeTypes: ["PREDICTED_TO_AFFECT"], direction: "in", limit: 15, sort: "-max_l2g_score" },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 12, sort: "-p_value_mlog" },
        ],
      },
      {
        branch: [
          { edgeTypes: ["OVERLAPS"], direction: "out", limit: 20 },
          { edgeTypes: ["GWAS_ASSOCIATED_WITH"], direction: "out", limit: 10, sort: "-p_value_mlog" },
        ],
      },
      {
        edgeTypes: ["EXPERIMENTALLY_REGULATES", "COMPUTATIONALLY_REGULATES"],
        direction: "out",
        limit: 20,
        overlayOnly: true,
      },
    ],
    limits: { maxNodes: 200, maxEdges: 600 },
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    description: "Drugs targeting this gene, what they treat, and side effects",
    icon: "pill",
    color: "#22c55e",
    // Step 1: drugs that target this gene
    // Step 2: overlay PGx interaction and clinical drug evidence from gene onto those drugs
    // Step 3: branch — side effects, disease indications, and PGx variant responders
    steps: [
      { edgeTypes: ["TARGETS"], direction: "in", limit: 15 },
      {
        edgeTypes: ["HAS_PGX_INTERACTION", "HAS_CLINICAL_DRUG_EVIDENCE"],
        direction: "in",
        limit: 50,
        overlayOnly: true,
      },
      {
        branch: [
          { edgeTypes: ["HAS_ADVERSE_REACTION", "HAS_SIDE_EFFECT"], direction: "out", limit: 12 },
          { edgeTypes: ["INDICATED_FOR"], direction: "out", limit: 10 },
          { edgeTypes: ["AFFECTS_RESPONSE_TO", "PGX_CLINICAL_RESPONSE"], direction: "in", limit: 10 },
        ],
      },
    ],
    limits: { maxNodes: 250, maxEdges: 800 },
  },
  {
    id: "network",
    name: "Network",
    description: "Protein interactions, shared pathways, and genetic variants",
    icon: "network",
    color: "#3b82f6",
    // Step 1: physical PPI + directed signaling from seed gene
    // Step 2: branch — overlay cross-PPI among interactors, discover shared pathways + GWAS variants
    steps: [
      { edgeTypes: ["INTERACTS_WITH", "REGULATES"], direction: "out", limit: 25 },
      {
        branch: [
          { edgeTypes: ["INTERACTS_WITH"], direction: "out", limit: 50, overlayOnly: true },
          { edgeTypes: ["PARTICIPATES_IN"], direction: "out", limit: 10 },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 8, sort: "-p_value_mlog" },
        ],
      },
    ],
    limits: { maxNodes: 300, maxEdges: 1000 },
  },
  {
    id: "phenotype",
    name: "Phenotype",
    description: "Physical traits, phenotypes, and their linked diseases",
    icon: "activity",
    color: "#ec4899",
    // Step 1: branch — human + mouse phenotypes, scored traits
    // Step 2: branch — diseases from phenotypes (PRESENTS_WITH) + diseases from traits (MAPS_TO)
    //         + overlay trait↔phenotype cross-links (TRAIT_PRESENTS_WITH)
    steps: [
      {
        branch: [
          { edgeTypes: ["MANIFESTS_AS", "MOUSE_MANIFESTS_AS"], direction: "out", limit: 15 },
          { edgeTypes: ["SCORED_FOR_TRAIT"], direction: "out", limit: 10, sort: "-total_score" },
        ],
      },
      {
        branch: [
          { edgeTypes: ["PRESENTS_WITH"], direction: "in", limit: 12 },
          { edgeTypes: ["MAPS_TO"], direction: "out", limit: 8 },
          { edgeTypes: ["TRAIT_PRESENTS_WITH"], direction: "out", limit: 20, overlayOnly: true },
        ],
      },
    ],
    limits: { maxNodes: 200, maxEdges: 600 },
  },
  {
    id: "functional",
    name: "Functional",
    description: "Biological processes, molecular roles, and pathway context",
    icon: "microscope",
    color: "#14b8a6",
    // Step 1: branch — GO term annotations + pathway membership
    // Step 2: metabolites involved in those pathways
    steps: [
      {
        branch: [
          { edgeTypes: ["ANNOTATED_WITH"], direction: "out", limit: 15 },
          { edgeTypes: ["PARTICIPATES_IN"], direction: "out", limit: 12 },
        ],
      },
      {
        edgeTypes: ["CONTAINS_METABOLITE"],
        direction: "out",
        limit: 10,
      },
    ],
    limits: { maxNodes: 200, maxEdges: 600 },
  },
];
