import type { EdgeType } from "../types/edge";
import type { EntityType } from "../types/entity";
import type { LensStep } from "./lenses";

// =============================================================================
// Explorer Config Types — Generic, config-driven graph exploration
// =============================================================================

export type TemplateId = string;

export interface ExplorerTemplate {
  id: TemplateId;
  /** Human-readable name, e.g. "Gene → Disease" */
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: LensStep[];
  limits: { maxNodes: number; maxEdges: number };
  /** The entity type that this template primarily targets for ranked results */
  targetEntityType: EntityType;
  /** Optional ranking configuration for the results list */
  rankBy?: { field: string; direction: "asc" | "desc"; label: string };
}

export interface EdgeTypeGroup {
  label: string;
  types: EdgeType[];
}

export interface ExternalLinkConfig {
  label: string;
  /** URL template with {id} and {label} placeholders */
  urlTemplate: string;
}

export interface SeedEntity {
  type: EntityType;
  id: string;
  label: string;
}

export interface ExplorerConfig {
  seedEntityType: EntityType;
  templates: ExplorerTemplate[];
  defaultTemplateId: TemplateId;
  edgeTypeGroups: EdgeTypeGroup[];
  externalLinks: Partial<Record<EntityType, ExternalLinkConfig[]>>;
  enableVariantTrail: boolean;
}
