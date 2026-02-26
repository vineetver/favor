import type { ExplorerNode, ExplorerEdge } from "./node";
import type { EntityType } from "./entity";

// =============================================================================
// Template Result Types — ranked entity results from template queries
// =============================================================================

export interface TemplateResultEntry {
  node: ExplorerNode;
  connectingEdge: ExplorerEdge;
  rankValue: number | null;
}

export interface TemplateResultData {
  templateId: string;
  targetEntityType: EntityType;
  rankLabel?: string;
  results: TemplateResultEntry[];
}
