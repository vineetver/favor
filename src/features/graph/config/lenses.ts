import type { EdgeType } from "../types/edge";
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

