"use client";

import { Button } from "@shared/components/ui/button";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { formatNumericValue as formatNumber } from "@shared/utils/value-formatters";
import {
  Activity,
  AlertTriangle,
  Beaker,
  ChevronDown,
  ChevronRight,
  Database,
  Dna,
  Expand,
  HeartPulse,
  Info,
  Link2,
  Loader2,
  Microscope,
  Network,
  Pill,
  Route,
  Target,
  Trash2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import type { SchemaPropertyMeta } from "../api";
import type { ExpansionConfig } from "../config/expansion";
import { NODE_EXPANSION_CONFIG } from "../config/expansion";
import type { ExternalLinkConfig } from "../config/explorer-config";
import { NODE_TYPE_COLORS } from "../config/styling";
import { hasVariantTrail } from "../config/variant-trail";
import type {
  ConnectionsDrilldownData,
  ConnectionsEdgeGroup,
  ConnectionsStatus,
} from "../types/connections";
import type { EdgeType } from "../types/edge";
import { EDGE_TYPE_CONFIG, getEdgeDatabase } from "../types/edge";
import type { EntityType } from "../types/entity";
import type { ExplorerEdge, ExplorerNode } from "../types/node";
import type { InspectorPanelProps } from "../types/props";
import type { ProvenanceEvent } from "../types/provenance";
import type { GraphSchema } from "../types/schema";
import { displayEntityType, formatNodeId } from "../utils/display-names";
import {
  buildFieldLabelMap,
  filterEdgeFields,
} from "../utils/edge-field-filter";
import {
  buildEdgeTypeStatsMap,
  resolveScoreFields,
} from "../utils/schema-fields";
import { VariantTrailResults } from "./variant-trail-results";

// =============================================================================
// Icon Map for Expansion Configs
// =============================================================================

const EXPANSION_ICONS: Record<string, React.ReactNode> = {
  "heart-pulse": <HeartPulse className="w-4 h-4" />,
  pill: <Pill className="w-4 h-4" />,
  route: <Route className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
  target: <Target className="w-4 h-4" />,
  dna: <Dna className="w-4 h-4" />,
  network: <Network className="w-4 h-4" />,
  "alert-triangle": <AlertTriangle className="w-4 h-4" />,
  microscope: <Microscope className="w-4 h-4" />,
  "bar-chart": <Activity className="w-4 h-4" />,
  tag: <Activity className="w-4 h-4" />,
  "book-open": <Database className="w-4 h-4" />,
  beaker: <Beaker className="w-4 h-4" />,
};

// =============================================================================
// Provenance Display
// =============================================================================

function ProvenanceDisplay({ events }: { events: ProvenanceEvent[] }) {
  if (events.length === 0) return null;
  const latest = events[events.length - 1];

  return (
    <p className="text-[11px] text-muted-foreground text-right">
      added by {latest.label}
    </p>
  );
}

// =============================================================================
// Schema-aware Edge Field Rendering
// =============================================================================

/** Snake_case to readable label */
function fieldLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .replace(/\bIds\b/g, "IDs")
    .replace(/\bPmid\b/g, "PMID")
    .replace(/\bPgx\b/g, "PGx")
    .replace(/\bOt\b/g, "OT")
    .replace(/\bMi\b/g, "MI")
    .replace(/\bNct\b/g, "NCT")
    .replace(/\bL2g\b/g, "L2G")
    .replace(/\bGo\b/g, "GO");
}

/** Check if a field key represents PubMed IDs (pattern match) */
function isPubmedField(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes("pubmed") || k.includes("pmid");
}

/** Check if a field key is a URL (pattern match) */
function isUrlField(key: string): boolean {
  const k = key.toLowerCase();
  return k === "url" || k.endsWith("_url") || k === "report_url";
}

/** Render a single field value */
function FieldValue({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;

  // PubMed IDs — pattern matched
  if (isPubmedField(fieldKey)) {
    const ids = Array.isArray(value) ? value : [value];
    const pmids = ids.map(String).filter(Boolean);
    if (pmids.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {pmids.slice(0, 5).map((pmid) => (
          <ExternalLink
            key={pmid}
            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
            className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100"
          >
            PMID:{pmid}
          </ExternalLink>
        ))}
        {pmids.length > 5 && (
          <span className="text-xs text-muted-foreground">
            +{pmids.length - 5} more
          </span>
        )}
      </div>
    );
  }

  // URLs — pattern matched
  if (isUrlField(fieldKey) && typeof value === "string") {
    return (
      <ExternalLink
        href={value}
        className="text-xs text-indigo-600 hover:underline truncate"
      >
        {value}
      </ExternalLink>
    );
  }

  // Boolean
  if (typeof value === "boolean") {
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-medium ${value ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }

  // Number
  if (typeof value === "number") {
    return (
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {formatNumber(value)}
      </span>
    );
  }

  // String arrays
  if (Array.isArray(value)) {
    const items = value.map(String).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 8).map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="px-1.5 py-0.5 bg-muted text-foreground text-xs rounded"
          >
            {item}
          </span>
        ))}
        {items.length > 8 && (
          <span className="text-xs text-muted-foreground">
            +{items.length - 8} more
          </span>
        )}
      </div>
    );
  }

  // Objects
  if (typeof value === "object") {
    return (
      <pre className="text-xs text-muted-foreground bg-muted rounded p-1.5 overflow-x-auto max-h-24">
        {JSON.stringify(value, null, 1)}
      </pre>
    );
  }

  // Default string
  return (
    <span className="text-sm text-foreground break-words">{String(value)}</span>
  );
}

/** Field label with optional info tooltip showing schema description */
function FieldHeader({
  label,
  description,
  className,
}: {
  label: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${className ?? "text-xs font-medium text-muted-foreground"}`}
    >
      <span>{label}</span>
      {description && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/** Render all fields from an edge's `fields` dict, split into key metrics and details.
 *  Uses meta.hidden (via filterEdgeFields) to suppress fields, meta.displayOrder
 *  for key-field promotion, and meta.label for labels.
 *
 *  Key fields: entries with displayOrder → sorted by displayOrder.
 *  Fallback: schema scoreFields when no displayOrder entries exist.
 *  Detail fields: everything else, sorted alphabetically. */
function EdgeFields({
  fields,
  edgeType,
  schema,
  propertyMeta,
}: {
  fields: Record<string, unknown>;
  edgeType?: EdgeType;
  schema?: GraphSchema | null;
  propertyMeta?: SchemaPropertyMeta[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Build schema map once (memoized to avoid recomputing on every render)
  const schemaMap = useMemo(() => buildEdgeTypeStatsMap(schema), [schema]);

  // Filter fields — meta.hidden + empty values
  const filteredFields = filterEdgeFields(fields, propertyMeta);

  const entries = Object.entries(filteredFields).filter(
    ([, value]) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );

  if (entries.length === 0) return null;

  // Build metadata map for display hints
  const metaMap = new Map<string, SchemaPropertyMeta>();
  if (propertyMeta) {
    for (const prop of propertyMeta) metaMap.set(prop.name, prop);
  }

  // Build label map from schema metadata
  const schemaLabelMap = buildFieldLabelMap(propertyMeta);

  // Key fields: entries where meta.displayOrder is set
  const hasDisplayOrder = entries.some(
    ([key]) => metaMap.get(key)?.displayOrder != null,
  );

  // If no displayOrder entries and propertyMeta exists, fallback to schema scoreFields
  const schemaScoreFields = edgeType
    ? resolveScoreFields(edgeType, schemaMap)
    : [];
  const keyFieldSet = new Set<string>();

  if (hasDisplayOrder) {
    for (const [key] of entries) {
      if (metaMap.get(key)?.displayOrder != null) keyFieldSet.add(key);
    }
  } else if (schemaScoreFields.length > 0) {
    for (const sf of schemaScoreFields) keyFieldSet.add(sf);
  }

  // Split into key metrics vs. detail fields
  const keyEntries: Array<[string, unknown]> = [];
  const detailEntries: Array<[string, unknown]> = [];
  for (const entry of entries) {
    if (keyFieldSet.has(entry[0])) {
      keyEntries.push(entry);
    } else {
      detailEntries.push(entry);
    }
  }

  // Sort key entries by displayOrder (or schema score field order)
  if (hasDisplayOrder) {
    keyEntries.sort(([a], [b]) => {
      const aOrder = metaMap.get(a)?.displayOrder ?? Infinity;
      const bOrder = metaMap.get(b)?.displayOrder ?? Infinity;
      return aOrder - bOrder;
    });
  } else {
    keyEntries.sort(([a], [b]) => {
      const aIdx = schemaScoreFields.indexOf(a);
      const bIdx = schemaScoreFields.indexOf(b);
      return aIdx - bIdx;
    });
  }

  // Sort detail entries alphabetically
  detailEntries.sort(([a], [b]) => a.localeCompare(b));

  // Label resolver: meta.label > auto-generated
  const getLabel = (key: string) => schemaLabelMap.get(key) ?? fieldLabel(key);

  // Description map from property metadata (for info tooltips)
  const descriptionMap = new Map<string, string>();
  if (propertyMeta) {
    for (const prop of propertyMeta) {
      if (prop.description) descriptionMap.set(prop.name, prop.description);
    }
  }

  // Fallback: if no key entries, show all entries flat (no collapsing)
  if (keyEntries.length === 0) {
    return (
      <div className="space-y-2.5">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <FieldHeader
              label={getLabel(key)}
              description={descriptionMap.get(key)}
            />
            <FieldValue fieldKey={key} value={value} />
          </div>
        ))}
      </div>
    );
  }

  // Auto-expand details when there are only a few
  const fewDetails = detailEntries.length <= 3;

  return (
    <div className="space-y-3">
      {/* Key Metrics — highlighted grid */}
      <div className="grid grid-cols-2 gap-2">
        {keyEntries.map(([key, value]) => (
          <div key={key} className="bg-muted rounded-md px-2.5 py-2">
            <FieldHeader
              label={getLabel(key)}
              description={descriptionMap.get(key)}
              className="text-[11px] font-medium text-muted-foreground mb-0.5"
            />
            <FieldValue fieldKey={key} value={value} />
          </div>
        ))}
      </div>

      {/* Detail fields — collapsible (auto-expand when ≤ 3) */}
      {detailEntries.length > 0 && (
        <div>
          {!fewDetails && (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              {detailsOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              {detailEntries.length} more field
              {detailEntries.length !== 1 ? "s" : ""}
            </button>
          )}
          {(fewDetails || detailsOpen) && (
            <div className={`space-y-2.5 ${fewDetails ? "" : "mt-2"}`}>
              {detailEntries.map(([key, value]) => (
                <div key={key} className="space-y-0.5">
                  <FieldHeader
                    label={getLabel(key)}
                    description={descriptionMap.get(key)}
                  />
                  <FieldValue fieldKey={key} value={value} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Single Edge Instance (collapsible within RelationshipGroup)
// =============================================================================

/** Shared edge content — fields, evidence, provenance */
function EdgeContent({
  edge,
  provenance,
  schema,
  propertyMeta,
}: {
  edge: ExplorerEdge;
  provenance: ProvenanceEvent[];
  schema?: GraphSchema | null;
  propertyMeta?: SchemaPropertyMeta[];
}) {
  const config = EDGE_TYPE_CONFIG[edge.type];
  const hasFields = edge.fields && Object.keys(edge.fields).length > 0;
  const hasEvidence =
    edge.evidence?.sources?.length ||
    edge.evidence?.pubmedIds?.length ||
    edge.evidence?.detectionMethods?.length;
  const hasContent =
    hasFields ||
    hasEvidence ||
    edge.numSources !== undefined ||
    edge.numExperiments !== undefined;

  return (
    <div className="space-y-3">
      {config?.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}

      {/* Schema-driven fields — filtered to evidence/relationship only */}
      {edge.fields && Object.keys(edge.fields).length > 0 && (
        <EdgeFields
          fields={edge.fields}
          edgeType={edge.type}
          schema={schema}
          propertyMeta={propertyMeta}
        />
      )}

      {/* Legacy evidence (from subgraph API with includeProps) */}
      {edge.evidence?.sources && edge.evidence.sources.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Data Sources
          </div>
          <div className="flex flex-wrap gap-1">
            {edge.evidence.sources.map((source, i) => (
              <span
                key={`${source}-${i}`}
                className="px-1.5 py-0.5 bg-muted text-foreground text-xs rounded"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {edge.evidence?.pubmedIds && edge.evidence.pubmedIds.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            Publications
          </div>
          <div className="flex flex-wrap gap-1">
            {edge.evidence.pubmedIds.slice(0, 5).map((pmid) => (
              <ExternalLink
                key={pmid}
                href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded hover:bg-indigo-100"
              >
                PMID:{pmid}
              </ExternalLink>
            ))}
            {edge.evidence.pubmedIds.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{edge.evidence.pubmedIds.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {edge.evidence?.detectionMethods &&
        edge.evidence.detectionMethods.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">
              Detection Methods
            </div>
            <div className="flex flex-wrap gap-1">
              {edge.evidence.detectionMethods.slice(0, 5).map((method, i) => (
                <span
                  key={`${method}-${i}`}
                  className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        )}

      {!hasContent && (
        <p className="text-xs text-muted-foreground italic">
          No additional data available
        </p>
      )}

      {provenance.length > 0 && <ProvenanceDisplay events={provenance} />}
    </div>
  );
}

function EdgeInstance({
  edge,
  provenance,
  defaultOpen,
  insideGroup,
  schema,
  propertyMeta,
}: {
  edge: ExplorerEdge;
  provenance: ProvenanceEvent[];
  defaultOpen: boolean;
  /** When true, renders flat (no card wrapper — parent group provides structure) */
  insideGroup?: boolean;
  schema?: GraphSchema | null;
  propertyMeta?: SchemaPropertyMeta[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = EDGE_TYPE_CONFIG[edge.type];

  // Prefer per-edge source fields over static type default
  const rawSource = edge.fields?.source ?? edge.fields?.sources;
  const edgeSource = rawSource
    ? Array.isArray(rawSource)
      ? (rawSource as string[]).join(", ")
      : String(rawSource)
    : getEdgeDatabase(edge.type);

  // Inside a group: render flat, no wrapper card
  if (insideGroup) {
    return (
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            {edgeSource}
          </span>
          {edge.numSources !== undefined && (
            <span className="text-xs text-muted-foreground">
              · {edge.numSources} source{edge.numSources !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <EdgeContent
          edge={edge}
          provenance={provenance}
          schema={schema}
          propertyMeta={propertyMeta}
        />
      </div>
    );
  }

  // Standalone: collapsible card
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: config?.color ?? "#94a3b8" }}
        />
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {config?.label ?? edge.type}
        </span>
        <span className="px-1.5 py-0.5 bg-muted text-xs text-muted-foreground rounded shrink-0">
          {edgeSource}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-border">
          <EdgeContent
            edge={edge}
            provenance={provenance}
            schema={schema}
            propertyMeta={propertyMeta}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Relationship Type Group (collapsible group within connections drilldown)
// =============================================================================

interface RelationshipTypeGroupProps {
  group: ConnectionsEdgeGroup;
  selectedEdgeId: string;
  getProvenance: (id: string) => ProvenanceEvent[];
  onLoadMore?: (edgeType: EdgeType) => void;
  schema?: GraphSchema | null;
}

function RelationshipTypeGroup({
  group,
  selectedEdgeId,
  getProvenance,
  onLoadMore,
  schema,
}: RelationshipTypeGroupProps) {
  const config = EDGE_TYPE_CONFIG[group.type];
  const containsSelected = group.edges.some((e) => e.id === selectedEdgeId);
  const [open, setOpen] = useState(containsSelected);
  const remaining = group.totalCount - group.edges.length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-accent transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: config?.color ?? "#94a3b8" }}
        />
        <span className="text-sm font-medium text-foreground flex-1 truncate">
          {config?.label ?? group.type}
        </span>
        {!group.hasLocalEdges && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded shrink-0">
            from database
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-muted text-xs text-muted-foreground rounded tabular-nums shrink-0">
          {group.totalCount}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {group.direction === "in" ? "\u2190" : "\u2192"}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
          {group.edges.map((e) => (
            <EdgeInstance
              key={e.id}
              edge={e}
              provenance={getProvenance(e.id)}
              defaultOpen={e.id === selectedEdgeId}
              insideGroup
              schema={schema}
              propertyMeta={group.propertyMeta}
            />
          ))}

          {/* Load more button */}
          {group.nextCursor && onLoadMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => onLoadMore(group.type)}
              disabled={group.pageStatus === "loading"}
            >
              {group.pageStatus === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              ) : null}
              Load more{remaining > 0 ? ` (${remaining} remaining)` : ""}
            </Button>
          )}

          {group.pageStatus === "error" && (
            <p className="text-xs text-amber-600 text-center">
              Failed to load more. Try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Edge Detail — RelationshipGroup (all edges between a pair)
// =============================================================================

interface EdgeDetailProps {
  edge: ExplorerEdge;
  allEdges: ExplorerEdge[];
  getNode: (id: string) => ExplorerNode | undefined;
  getProvenance: (id: string) => ProvenanceEvent[];
  connectionsData?: ConnectionsDrilldownData | null;
  connectionsStatus?: ConnectionsStatus;
  connectionsError?: string | null;
  onLoadMoreEdges?: (edgeType: EdgeType) => void;
  onRetryConnections?: () => void;
  schema?: GraphSchema | null;
}

function EdgeDetail({
  edge,
  allEdges,
  getNode,
  getProvenance,
  connectionsData,
  connectionsStatus,
  connectionsError,
  onLoadMoreEdges,
  onRetryConnections,
  schema,
}: EdgeDetailProps) {
  const sourceNode = getNode(edge.sourceId);
  const targetNode = getNode(edge.targetId);
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Use grouped view when connections data is available
  const useGroupedView = connectionsData && connectionsData.groups.length > 0;
  const totalRelationships = useGroupedView
    ? connectionsData.groups.reduce((sum, g) => sum + g.totalCount, 0)
    : allEdges.length;

  return (
    <div className="space-y-4">
      {/* Pair header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground truncate">
            {sourceNode?.label ?? edge.sourceId}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground truncate">
            {targetNode?.label ?? edge.targetId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {totalRelationships === 1
              ? "1 relationship"
              : `${totalRelationships} relationships between this pair`}
          </p>
          {connectionsStatus === "loading" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading all relationships...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {connectionsStatus === "error" && connectionsError && !errorDismissed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700 flex-1">
            {connectionsError}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {onRetryConnections && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-amber-700 hover:text-amber-800"
                onClick={onRetryConnections}
              >
                Retry
              </Button>
            )}
            <button
              className="text-amber-500 hover:text-amber-700"
              onClick={() => setErrorDismissed(true)}
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>
        </div>
      )}

      {/* Grouped view (connections drilldown) */}
      {useGroupedView ? (
        <div className="space-y-2">
          {connectionsData.groups.map((group) => (
            <RelationshipTypeGroup
              key={group.type}
              group={group}
              selectedEdgeId={edge.id}
              getProvenance={getProvenance}
              onLoadMore={onLoadMoreEdges}
              schema={schema}
            />
          ))}
        </div>
      ) : (
        /* Flat view (fallback when no connections data) */
        <div className="space-y-2">
          {allEdges.map((e) => (
            <EdgeInstance
              key={e.id}
              edge={e}
              provenance={getProvenance(e.id)}
              defaultOpen={e.id === edge.id}
              schema={schema}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Node Detail Component
// =============================================================================

interface NodeDetailProps {
  node: ExplorerNode;
  provenance: ProvenanceEvent[];
  onExpand: (nodeId: string, expansion?: ExpansionConfig) => void;
  onRemove: (nodeId: string) => void;
  onFindPaths: (fromId: string, toId: string) => void;
  isExpanding: boolean;
  externalLinks: Partial<Record<EntityType, ExternalLinkConfig[]>>;
  enableVariantTrail: boolean;
  onRunVariantTrail?: (nodeId: string) => void;
}

function NodeDetail({
  node,
  provenance,
  onExpand,
  onRemove,
  onFindPaths,
  isExpanding,
  externalLinks,
  enableVariantTrail,
  onRunVariantTrail,
}: NodeDetailProps) {
  const colors = NODE_TYPE_COLORS[node.type] ?? {
    background: "#e2e8f0",
    border: "#94a3b8",
    text: "#334155",
  };
  const expansionOptions = NODE_EXPANSION_CONFIG[node.type] ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: colors.border }}
          />
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: colors.background, color: colors.text }}
          >
            {displayEntityType(node.type)}
          </span>
          {node.isSeed && (
            <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 font-medium">
              Seed
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{node.label}</h3>
        <p className="text-xs font-mono text-muted-foreground">
          {formatNodeId(node.id)}
        </p>
      </div>

      {/* Stats */}
      {(node.degree !== undefined || node.hubScore !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {node.degree !== undefined && (
            <div className="bg-muted rounded-lg p-3 text-center">
              <Network className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <div className="text-lg font-semibold text-foreground">
                {node.degree}
              </div>
              <div className="text-xs text-muted-foreground">Connections</div>
            </div>
          )}
          {node.hubScore !== undefined && (
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <Beaker className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-amber-700">
                {(node.hubScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-amber-600">Hub Score</div>
            </div>
          )}
        </div>
      )}

      {/* External Links */}
      {(() => {
        const links = externalLinks[node.type] ?? [];
        if (links.length === 0) return null;
        return (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              External Resources
            </h4>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <ExternalLink
                  key={link.label}
                  href={link.urlTemplate
                    .replace("{id}", node.id)
                    .replace("{label}", node.label)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {link.label}
                </ExternalLink>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Route to Variants */}
      {enableVariantTrail &&
        hasVariantTrail(node.type) &&
        onRunVariantTrail && (
          <div className="pt-2 border-t border-border">
            <button
              className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-left hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onRunVariantTrail(node.id)}
              disabled={isExpanding}
            >
              <div className="p-1 rounded bg-primary/10 text-primary">
                {isExpanding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Microscope className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Route to Variants
                </div>
                <div className="text-xs text-muted-foreground">
                  Find variant evidence from this node
                </div>
              </div>
            </button>
          </div>
        )}

      {/* Context-Aware Expansion Options */}
      {expansionOptions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explore Relationships
          </h4>
          <div className="space-y-1.5">
            {expansionOptions.map((option) => (
              <button
                key={option.label}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background text-left hover:border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onExpand(node.id, option)}
                disabled={isExpanding}
              >
                <div
                  className="mt-0.5 p-1 rounded"
                  style={{
                    backgroundColor: `${option.color}15`,
                    color: option.color,
                  }}
                >
                  {isExpanding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    (EXPANSION_ICONS[option.icon] ?? (
                      <Expand className="w-4 h-4" />
                    ))
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {option.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h4>
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onExpand(node.id)}
            disabled={isExpanding}
          >
            {isExpanding ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Expand className="w-4 h-4 mr-2" />
            )}
            Expand All Neighbors
          </Button>
          {!node.isSeed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onRemove(node.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove from Graph
            </Button>
          )}
        </div>
      </div>

      {/* Provenance */}
      {provenance.length > 0 && (
        <div className="pt-2 border-t border-border">
          <ProvenanceDisplay events={provenance} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Multi-Select Detail Component
// =============================================================================

interface MultiSelectDetailProps {
  nodeIds: Set<string>;
  getNode: (id: string) => ExplorerNode | undefined;
  onFindPaths: (fromId: string, toId: string) => void;
}

function MultiSelectDetail({
  nodeIds,
  getNode,
  onFindPaths,
}: MultiSelectDetailProps) {
  const nodes = Array.from(nodeIds)
    .map((id) => getNode(id))
    .filter((n): n is ExplorerNode => n !== undefined);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {nodes.length} nodes selected
        </h3>
        <p className="text-sm text-muted-foreground">
          Compare nodes or find shared connections
        </p>
      </div>

      {/* Selected Nodes List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Selected Nodes
        </h4>
        <div className="space-y-1.5">
          {nodes.map((node) => {
            const colors = NODE_TYPE_COLORS[node.type];
            return (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 bg-muted rounded"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="text-sm font-medium text-foreground truncate">
                  {node.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {displayEntityType(node.type)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Actions
        </h4>
        {nodes.length === 2 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => onFindPaths(nodes[0].id, nodes[1].id)}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Find Paths Between Nodes
          </Button>
        )}
        {nodes.length >= 2 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled
          >
            <Network className="w-4 h-4 mr-2" />
            Find Shared Neighbors (Coming Soon)
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

function InspectorPanelInner({
  selection,
  getNode,
  getEdge,
  getProvenance,
  getEdgesBetween,
  onExpandNode,
  onRemoveNode,
  onFindPaths,
  isExpanding,
  externalLinks,
  enableVariantTrail,
  onRunVariantTrail,
  activeTrailResult,
  onClearTrailResult,
  onSelectTrailVariant,
  connectionsData,
  connectionsStatus,
  connectionsError,
  onLoadMoreEdges,
  onRetryConnections,
  schema,
}: InspectorPanelProps) {
  // Show trail results when active and matches selected node
  if (
    activeTrailResult &&
    selection.type === "node" &&
    activeTrailResult.seedNodeId === selection.nodeId &&
    onClearTrailResult
  ) {
    return (
      <VariantTrailResults
        result={activeTrailResult}
        onBack={onClearTrailResult}
        onSelectNode={(node) => {
          onClearTrailResult();
          onSelectTrailVariant?.(node);
        }}
      />
    );
  }

  if (selection.type === "none") {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Click a node or edge to inspect it.
      </div>
    );
  }

  return (
    <>
      {selection.type === "node" && (
        <NodeDetail
          node={selection.node}
          provenance={getProvenance(selection.nodeId)}
          onExpand={onExpandNode}
          onRemove={onRemoveNode}
          onFindPaths={onFindPaths}
          isExpanding={isExpanding}
          externalLinks={externalLinks}
          enableVariantTrail={enableVariantTrail}
          onRunVariantTrail={onRunVariantTrail}
        />
      )}

      {selection.type === "edge" && (
        <EdgeDetail
          edge={selection.edge}
          allEdges={getEdgesBetween(
            selection.edge.sourceId,
            selection.edge.targetId,
          )}
          getNode={getNode}
          getProvenance={getProvenance}
          connectionsData={connectionsData}
          connectionsStatus={connectionsStatus}
          connectionsError={connectionsError}
          onLoadMoreEdges={onLoadMoreEdges}
          onRetryConnections={onRetryConnections}
          schema={schema}
        />
      )}

      {selection.type === "multi" && (
        <MultiSelectDetail
          nodeIds={selection.nodeIds}
          getNode={getNode}
          onFindPaths={onFindPaths}
        />
      )}
    </>
  );
}

export const InspectorPanel = memo(InspectorPanelInner);
