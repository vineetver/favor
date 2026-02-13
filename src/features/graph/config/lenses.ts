import type { EdgeType } from "../types/edge";
import { getEdgeFieldsForTypes } from "../types/edge";

// =============================================================================
// Lens System - Curated Views via /graph/query
// =============================================================================

export interface QueryStep {
  edgeTypes: EdgeType[];
  direction: "in" | "out" | "both";
  limit?: number;
  sort?: string;
  filters?: Record<string, unknown>;
}

export type LensId = "clinical" | "regulatory" | "pharmacology" | "network" | "phenotype";

export interface GraphLens {
  id: LensId;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: QueryStep[];
  limits: { maxNodes: number; maxEdges: number };
  edgeFields?: string[];
}

export const DEFAULT_LENS: LensId = "clinical";

/**
 * Compute all schema fields for a lens by unioning the fields of its edge types.
 */
export function getLensEdgeFields(lens: GraphLens): string[] {
  const allEdgeTypes = lens.steps.flatMap((s) => s.edgeTypes);
  return getEdgeFieldsForTypes(allEdgeTypes);
}

export const GRAPH_LENSES: GraphLens[] = [
  {
    id: "clinical",
    name: "Clinical",
    description: "Top disease associations by evidence, then their indicated drugs",
    icon: "heart-pulse",
    color: "#ef4444",
    steps: [
      { edgeTypes: ["ASSOCIATED_WITH_DISEASE"], direction: "out", limit: 15, sort: "-overall_score" },
      { edgeTypes: ["INDICATED_FOR"], direction: "in", limit: 5 },
    ],
    limits: { maxNodes: 80, maxEdges: 200 },
  },
  {
    id: "regulatory",
    name: "Regulatory",
    description: "Curated disease links, then their ClinVar variant evidence",
    icon: "dna",
    color: "#8b5cf6",
    steps: [
      { edgeTypes: ["CURATED_FOR", "CAUSES", "INHERITED_CAUSE_OF"], direction: "out", limit: 10 },
      { edgeTypes: ["CLINVAR_ASSOCIATED"], direction: "in", limit: 5 },
    ],
    limits: { maxNodes: 80, maxEdges: 200 },
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    description: "Drugs targeting this gene, then their side effects",
    icon: "pill",
    color: "#22c55e",
    steps: [
      { edgeTypes: ["TARGETS"], direction: "in", limit: 15 },
      { edgeTypes: ["HAS_ADVERSE_REACTION", "HAS_SIDE_EFFECT"], direction: "out", limit: 5 },
    ],
    limits: { maxNodes: 100, maxEdges: 300 },
  },
  {
    id: "network",
    name: "Network",
    description: "Protein interactions, pathway membership, and functional relationships",
    icon: "network",
    color: "#3b82f6",
    steps: [
      { edgeTypes: ["INTERACTS_WITH", "INTERACTS_IN_PATHWAY", "FUNCTIONALLY_RELATED", "PARTICIPATES_IN"], direction: "out", limit: 30 },
    ],
    limits: { maxNodes: 100, maxEdges: 300 },
  },
  {
    id: "phenotype",
    name: "Phenotype",
    description: "Phenotype manifestations, then related diseases",
    icon: "activity",
    color: "#ec4899",
    steps: [
      { edgeTypes: ["MANIFESTS_AS", "MOUSE_MANIFESTS_AS"], direction: "out", limit: 15 },
      { edgeTypes: ["PRESENTS_WITH"], direction: "in", limit: 5 },
    ],
    limits: { maxNodes: 80, maxEdges: 200 },
  },
];
