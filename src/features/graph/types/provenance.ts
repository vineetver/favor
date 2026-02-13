import type { LensId } from "../config/lenses";

// =============================================================================
// Provenance — tracks why each node/edge exists in the graph
// =============================================================================

export type ProvenanceKind =
  | "lens"
  | "typed_expand"
  | "bfs_expand"
  | "seed"
  | "search";

export interface ProvenanceEvent {
  kind: ProvenanceKind;
  label: string;
  timestamp: number;
  lensId?: LensId;
  stepIndex?: number;
  sourceNodeId?: string;
  sourceNodeLabel?: string;
}

export function createProvenanceEvent(
  kind: ProvenanceKind,
  label: string,
  extra?: Partial<Omit<ProvenanceEvent, "kind" | "label" | "timestamp">>,
): ProvenanceEvent {
  return {
    kind,
    label,
    timestamp: Date.now(),
    ...extra,
  };
}
