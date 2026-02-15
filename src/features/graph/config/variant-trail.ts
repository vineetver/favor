import type { EdgeType } from "../types/edge";
import type { EntityType } from "../types/entity";

// =============================================================================
// Variant Trail — multi-step route configs to find Variant nodes
// =============================================================================

export interface VariantTrailStep {
  edgeTypes: EdgeType[];
  direction: "in" | "out" | "both";
  limit: number;
  sort?: string;
}

export interface VariantTrailRoute {
  steps: VariantTrailStep[];
  routeBadge: string;
}

export interface VariantTrailConfig {
  routes: VariantTrailRoute[];
  maxNodes: number;
  maxEdges: number;
}

/**
 * Route definitions per entity type. Each config specifies multi-step query routes,
 * limits, edge fields, and a route badge. Variant type is intentionally excluded.
 */
export const VARIANT_TRAIL_CONFIG: Partial<Record<EntityType, VariantTrailConfig>> = {
  // 1-step routes (Direct)
  Gene: {
    routes: [
      {
        steps: [
          { edgeTypes: ["PREDICTED_TO_AFFECT", "MISSENSE_PATHOGENIC_FOR", "CLINVAR_ANNOTATED_IN"], direction: "in", limit: 25 },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  Disease: {
    routes: [
      {
        steps: [
          { edgeTypes: ["CLINVAR_ASSOCIATED", "PGX_DISEASE_ASSOCIATED"], direction: "in", limit: 25 },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  Drug: {
    routes: [
      {
        steps: [
          { edgeTypes: ["PGX_CLINICAL_RESPONSE", "AFFECTS_RESPONSE_TO", "PGX_RESPONSE_FOR", "STUDIED_FOR_DRUG_RESPONSE", "FUNCTIONALLY_ASSAYED_FOR"], direction: "in", limit: 25 },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  Trait: {
    routes: [
      {
        steps: [
          { edgeTypes: ["GWAS_ASSOCIATED_WITH"], direction: "in", limit: 25, sort: "-p_value_mlog" },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  Study: {
    routes: [
      {
        steps: [
          { edgeTypes: ["REPORTED_IN"], direction: "in", limit: 25, sort: "-p_value_mlog" },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  cCRE: {
    routes: [
      {
        steps: [
          { edgeTypes: ["OVERLAPS"], direction: "in", limit: 25 },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  SideEffect: {
    routes: [
      {
        steps: [
          { edgeTypes: ["LINKED_TO_SIDE_EFFECT"], direction: "in", limit: 25 },
        ],
        routeBadge: "Direct",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },

  // 2-step routes
  Phenotype: {
    routes: [
      {
        steps: [
          { edgeTypes: ["PRESENTS_WITH"], direction: "in", limit: 10 },
          { edgeTypes: ["CLINVAR_ASSOCIATED"], direction: "in", limit: 15 },
        ],
        routeBadge: "via Disease",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  Pathway: {
    routes: [
      {
        steps: [
          { edgeTypes: ["PARTICIPATES_IN"], direction: "in", limit: 10 },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 15 },
        ],
        routeBadge: "via Gene",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  GOTerm: {
    routes: [
      {
        steps: [
          { edgeTypes: ["ANNOTATED_WITH"], direction: "in", limit: 10 },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 15 },
        ],
        routeBadge: "via Gene",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
  OntologyTerm: {
    routes: [
      {
        steps: [
          { edgeTypes: ["SE_MAPS_TO"], direction: "in", limit: 10 },
          { edgeTypes: ["LINKED_TO_SIDE_EFFECT"], direction: "in", limit: 15 },
        ],
        routeBadge: "via SideEffect",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },

  // 3-step route
  Metabolite: {
    routes: [
      {
        steps: [
          { edgeTypes: ["CONTAINS_METABOLITE"], direction: "in", limit: 8 },
          { edgeTypes: ["PARTICIPATES_IN"], direction: "in", limit: 8 },
          { edgeTypes: ["HAS_GWAS_VARIANT"], direction: "out", limit: 10 },
        ],
        routeBadge: "via Pathway, Gene",
      },
    ],
    maxNodes: 140,
    maxEdges: 260,
  },
};

/** Check if a given entity type supports the variant trail action. */
export function hasVariantTrail(entityType: EntityType): boolean {
  return entityType !== "Variant" && entityType in VARIANT_TRAIL_CONFIG;
}
