import type { TemplateId } from "../config/explorer-config";

// =============================================================================
// Provenance — tracks why each node/edge exists in the graph
// =============================================================================

export type ProvenanceKind =
  | "lens"
  | "typed_expand"
  | "bfs_expand"
  | "seed"
  | "search"
  | "variant_trail";

export interface ProvenanceEvent {
  kind: ProvenanceKind;
  label: string;
  timestamp: number;
  templateId?: TemplateId;
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
